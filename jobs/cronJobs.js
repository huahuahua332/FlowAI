const cron = require('node-cron');
const Video = require('../models/Video');
const HotPrompt = require('../models/HotPrompt');
const User = require('../models/User');
const notificationService = require('../services/notificationService');
const signedUrlService = require('../services/signedUrlService');
const videoService = require('../services/videoService');

class CronJobs {
  // 启动所有定时任务
  static start() {
    console.log('启动定时任务...');
    
    // 每天 0 点更新热门提示词
    this.scheduleHotPromptUpdate();
    
    // 每天 1 点清理过期订阅
    this.scheduleSubscriptionCleanup();
    
    // 每10分钟检查超时和失败的视频生成任务
    this.scheduleVideoTimeoutCheck();
    
    // 每小时清理过期的签名URL
    this.scheduleSignedUrlCleanup();
    
    // 每天 2 点检查需要重试的任务
    this.scheduleRetryFailedVideos();
    
    // 每天 3 点发送订阅到期提醒
    this.scheduleSubscriptionReminders();
    
    // 每天 4 点清理用户并发任务计数
    this.scheduleConcurrentTasksCleanup();
    
    // 每天 5 点更新用户风险评分
    this.scheduleRiskScoreUpdate();
    
    console.log('所有定时任务已启动');
  }

  // 每天 0 点更新热门提示词统计
  static scheduleHotPromptUpdate() {
    cron.schedule('0 0 * * *', async () => {
      console.log('开始更新热门提示词统计...');
      
      try {
        // 获取过去24小时内的视频生成记录
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const recentVideos = await Video.find({
          createdAt: { $gte: yesterday },
          status: { $in: ['completed', 'processing'] }
        }).select('prompt');

        // 统计提示词使用频率
        const promptStats = {};
        recentVideos.forEach(video => {
          const prompt = video.prompt.trim();
          if (prompt.length > 0) {
            promptStats[prompt] = (promptStats[prompt] || 0) + 1;
          }
        });

        // 更新热门提示词表
        for (const [prompt, count] of Object.entries(promptStats)) {
          await HotPrompt.findOneAndUpdate(
            { prompt },
            { 
              $inc: { usageCount: count },
              $set: { lastUsed: new Date() }
            },
            { upsert: true }
          );
        }

        // 清理使用次数过低的旧提示词（保留最近30天内使用过的）
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        await HotPrompt.deleteMany({
          usageCount: { $lt: 2 },
          lastUsed: { $lt: thirtyDaysAgo }
        });

        console.log(`热门提示词统计更新完成，处理了 ${Object.keys(promptStats).length} 个提示词`);
      } catch (error) {
        console.error('更新热门提示词统计失败:', error);
      }
    }, {
      timezone: 'Asia/Shanghai'
    });
  }

  // 每天 1 点清理过期订阅
  static scheduleSubscriptionCleanup() {
    cron.schedule('0 1 * * *', async () => {
      console.log('开始清理过期订阅...');
      
      try {
        const now = new Date();
        
        // 查找过期的付费订阅用户
        const expiredUsers = await User.find({
          subscriptionLevel: { $ne: 'free' },
          subscriptionExpiry: { $lt: now }
        });

        // 将过期用户降级为免费用户
        for (const user of expiredUsers) {
          await User.findByIdAndUpdate(user._id, {
            subscriptionLevel: 'free',
            subscriptionExpiry: null
          });
          
          console.log(`用户 ${user.email} 订阅已过期，已降级为免费用户`);
        }

        console.log(`订阅清理完成，处理了 ${expiredUsers.length} 个过期用户`);
      } catch (error) {
        console.error('清理过期订阅失败:', error);
      }
    }, {
      timezone: 'Asia/Shanghai'
    });
  }

  // 每10分钟检查超时和失败的视频生成任务
  static scheduleVideoTimeoutCheck() {
    cron.schedule('*/10 * * * *', async () => {
      console.log('开始检查超时的视频生成任务...');
      
      try {
        // 查找超时的视频
        const timeoutVideos = await Video.findTimeoutVideos();
        
        for (const video of timeoutVideos) {
          console.log(`视频 ${video._id} 生成超时，开始处理...`);
          
          // 标记为失败
          video.status = 'failed';
          video.errorMessage = '生成超时，请重试';
          video.processingCompletedAt = new Date();
          
          // 退还积分
          const refunded = await video.refundPoints('生成超时');
          if (refunded) {
            console.log(`视频 ${video._id} 积分退还成功`);
          }
          
          await video.save();
          
          // 减少用户并发任务计数
          await User.findByIdAndUpdate(video.userId, {
            $inc: { 'concurrentTasks.current': -1 }
          });
          
          // 发送通知
          try {
            const user = await User.findById(video.userId);
            if (user) {
              await notificationService.notifyVideoFailed(user, video);
            }
          } catch (notifyError) {
            console.error('发送超时通知失败:', notifyError);
          }
        }

        console.log(`超时任务检查完成，处理了 ${timeoutVideos.length} 个超时任务`);
      } catch (error) {
        console.error('检查超时任务失败:', error);
      }
    });
  }

  // 每小时清理过期的签名URL
  static scheduleSignedUrlCleanup() {
    cron.schedule('0 * * * *', async () => {
      console.log('开始清理过期的签名URL...');
      
      try {
        const result = await signedUrlService.cleanupExpiredSignedUrls();
        console.log(`签名URL清理完成，清理了 ${result.count} 个过期链接`);
      } catch (error) {
        console.error('清理过期签名URL失败:', error);
      }
    });
  }

  // 每天 2 点检查需要重试的任务
  static scheduleRetryFailedVideos() {
    cron.schedule('0 2 * * *', async () => {
      console.log('开始检查需要重试的失败任务...');
      
      try {
        // 查找可以重试的失败视频（24小时内失败，且重试次数未达上限）
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const retryableVideos = await Video.find({
          status: 'failed',
          updatedAt: { $gte: oneDayAgo },
          retryCount: { $lt: 3 }, // 最多重试3次
          $or: [
            { lastRetryAt: { $exists: false } },
            { lastRetryAt: { $lt: new Date(Date.now() - 2 * 60 * 60 * 1000) } } // 上次重试超过2小时
          ]
        }).limit(50); // 限制批量重试数量

        for (const video of retryableVideos) {
          try {
            console.log(`开始重试视频 ${video._id}...`);
            
            // 增加重试次数
            await video.incrementRetry();
            
            // 重置状态
            video.status = 'pending';
            video.errorMessage = null;
            video.processingStartedAt = null;
            video.processingCompletedAt = null;
            await video.save();
            
            // 重新提交生成任务
            const params = {
              prompt: video.prompt,
              duration: video.duration,
              model: video.model
            };
            
            // 这里需要根据模型类型调用对应的生成方法
            videoService.generateVideoAsync(video._id, params, video.model);
            
            console.log(`视频 ${video._id} 重试任务已提交`);
          } catch (retryError) {
            console.error(`重试视频 ${video._id} 失败:`, retryError);
          }
        }

        console.log(`重试任务检查完成，处理了 ${retryableVideos.length} 个可重试任务`);
      } catch (error) {
        console.error('检查重试任务失败:', error);
      }
    }, {
      timezone: 'Asia/Shanghai'
    });
  }

  // 每天 3 点发送订阅到期提醒
  static scheduleSubscriptionReminders() {
    cron.schedule('0 3 * * *', async () => {
      console.log('开始发送订阅到期提醒...');
      
      try {
        const now = new Date();
        const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        // 查找3天内到期的用户
        const soonExpiringUsers = await User.find({
          subscriptionLevel: { $ne: 'free' },
          subscriptionExpiry: { 
            $gte: now,
            $lte: threeDaysLater
          }
        });
        
        // 查找7天内到期的用户
        const weekExpiringUsers = await User.find({
          subscriptionLevel: { $ne: 'free' },
          subscriptionExpiry: { 
            $gte: threeDaysLater,
            $lte: sevenDaysLater
          }
        });
        
        // 发送3天到期提醒
        for (const user of soonExpiringUsers) {
          const daysLeft = Math.ceil((user.subscriptionExpiry - now) / (24 * 60 * 60 * 1000));
          await notificationService.notifySubscriptionExpiring(user, daysLeft);
        }
        
        // 发送7天到期提醒
        for (const user of weekExpiringUsers) {
          const daysLeft = Math.ceil((user.subscriptionExpiry - now) / (24 * 60 * 60 * 1000));
          await notificationService.notifySubscriptionExpiring(user, daysLeft);
        }
        
        console.log(`订阅提醒发送完成，3天内到期: ${soonExpiringUsers.length}，7天内到期: ${weekExpiringUsers.length}`);
      } catch (error) {
        console.error('发送订阅提醒失败:', error);
      }
    }, {
      timezone: 'Asia/Shanghai'
    });
  }

  // 每天 4 点清理用户并发任务计数
  static scheduleConcurrentTasksCleanup() {
    cron.schedule('0 4 * * *', async () => {
      console.log('开始清理用户并发任务计数...');
      
      try {
        // 重置所有用户的当前并发任务数
        // 这是一个安全措施，防止因为异常情况导致计数不准确
        const result = await User.updateMany(
          { 'concurrentTasks.current': { $gt: 0 } },
          { $set: { 'concurrentTasks.current': 0 } }
        );
        
        console.log(`并发任务计数清理完成，重置了 ${result.modifiedCount} 个用户的计数`);
      } catch (error) {
        console.error('清理并发任务计数失败:', error);
      }
    }, {
      timezone: 'Asia/Shanghai'
    });
  }

  // 每天 5 点更新用户风险评分
  static scheduleRiskScoreUpdate() {
    cron.schedule('0 5 * * *', async () => {
      console.log('开始更新用户风险评分...');
      
      try {
        // 获取所有有登录记录的用户
        const users = await User.find({
          'loginHistory.0': { $exists: true }
        }).limit(1000); // 限制批量处理数量
        
        let updatedCount = 0;
        
        for (const user of users) {
          try {
            const oldScore = user.riskProfile.trustScore;
            const newScore = user.calculateRiskScore();
            
            if (Math.abs(oldScore - newScore) > 5) { // 分数变化超过5分才更新
              await user.save();
              updatedCount++;
              
              // 如果风险评分过低，发送警告
              if (newScore < 50 && user.riskProfile.status === 'normal') {
                user.riskProfile.status = 'warning';
                user.riskProfile.restrictionReason = '风险评分过低，请注意账户安全';
                await user.save();
                
                console.log(`用户 ${user.email} 风险评分过低 (${newScore})，已标记为警告状态`);
              }
            }
          } catch (userError) {
            console.error(`更新用户 ${user._id} 风险评分失败:`, userError);
          }
        }
        
        console.log(`风险评分更新完成，更新了 ${updatedCount} 个用户的评分`);
      } catch (error) {
        console.error('更新风险评分失败:', error);
      }
    }, {
      timezone: 'Asia/Shanghai'
    });
  }

  // 每周统计报告
  static scheduleWeeklyReport() {
    cron.schedule('0 9 * * 1', async () => {
      console.log('生成每周统计报告...');
      
      try {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        // 统计本周数据
        const weeklyStats = await Video.aggregate([
          { $match: { createdAt: { $gte: weekAgo } } },
          {
            $group: {
              _id: null,
              totalVideos: { $sum: 1 },
              completedVideos: {
                $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
              },
              failedVideos: {
                $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
              },
              timeoutVideos: {
                $sum: { $cond: [{ $regex: ['$errorMessage', /超时/] }, 1, 0] }
              },
              refundedVideos: {
                $sum: { $cond: [{ $eq: ['$refunded', true] }, 1, 0] }
              },
              totalPoints: { $sum: '$pointsCost' },
              refundedPoints: { $sum: '$refundAmount' }
            }
          }
        ]);

        const newUsers = await User.countDocuments({
          createdAt: { $gte: weekAgo }
        });

        const restrictedUsers = await User.countDocuments({
          'riskProfile.status': { $in: ['warning', 'restricted', 'banned'] }
        });

        const stats = weeklyStats[0] || {
          totalVideos: 0,
          completedVideos: 0,
          failedVideos: 0,
          timeoutVideos: 0,
          refundedVideos: 0,
          totalPoints: 0,
          refundedPoints: 0
        };

        console.log('本周统计报告:');
        console.log(`- 新用户: ${newUsers}`);
        console.log(`- 风险用户: ${restrictedUsers}`);
        console.log(`- 总视频生成: ${stats.totalVideos}`);
        console.log(`- 成功生成: ${stats.completedVideos}`);
        console.log(`- 失败生成: ${stats.failedVideos}`);
        console.log(`- 超时生成: ${stats.timeoutVideos}`);
        console.log(`- 退款视频: ${stats.refundedVideos}`);
        console.log(`- 消耗积分: ${stats.totalPoints}`);
        console.log(`- 退还积分: ${stats.refundedPoints}`);
        console.log(`- 成功率: ${stats.totalVideos > 0 ? (stats.completedVideos / stats.totalVideos * 100).toFixed(2) : 0}%`);
        console.log(`- 退款率: ${stats.totalVideos > 0 ? (stats.refundedVideos / stats.totalVideos * 100).toFixed(2) : 0}%`);
      } catch (error) {
        console.error('生成每周报告失败:', error);
      }
    }, {
      timezone: 'Asia/Shanghai'
    });
  }
}

module.exports = CronJobs; 