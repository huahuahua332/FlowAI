const axios = require('axios');
const Video = require('../models/Video');
const User = require('../models/User');
const HotPrompt = require('../models/HotPrompt');
const ossService = require('./ossService');
const openaiService = require('./openaiService');
const replicateService = require('./replicateService');
const moderationService = require('./moderationService');
const notificationService = require('./notificationService');
const signedUrlService = require('./signedUrlService');
const i18nService = require('./i18nService');

class VideoService {


  // Google Veo-3 视频生成 (使用Replicate)
  async generateVeo3Video(params) {
    return await replicateService.generateVeo3Video(params);
  }

  // WAN I2V 视频生成 (图片到视频)
  async generateWanI2V(params) {
    return await replicateService.generateWanI2V(params);
  }

  // WAN T2V 视频生成 (文本到视频)
  async generateWanT2V(params) {
    return await replicateService.generateWanT2V(params);
  }

  // 处理视频生成请求
  async processVideoGeneration(userId, params, generationType, requiredPoints, singleVideoPoints) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // 检查用户状态和权限
      const canGenerate = user.canGenerateVideo();
      if (!canGenerate.allowed) {
        return { 
          success: false, 
          error: i18nService.getMessage(`limits.${canGenerate.reason}`, user.preferences?.language)
        };
      }

      // 检查频率限制
      const rateLimitCheck = user.checkRateLimit();
      if (!rateLimitCheck.allowed) {
        const message = rateLimitCheck.waitTime 
          ? i18nService.getMessage('limits.wait_seconds', user.preferences?.language, { seconds: rateLimitCheck.waitTime })
          : i18nService.getMessage(`limits.${rateLimitCheck.reason}`, user.preferences?.language);
        
        return { success: false, error: message };
      }

      // 内容审核
      const moderationResult = await moderationService.moderateText(params.prompt, user.preferences?.language);
      if (moderationResult.flagged) {
        return {
          success: false,
          error: moderationService.getModerationMessage(moderationResult, user.preferences?.language)
        };
      }

      const batchSize = params.batchSize || 1;
      const videoIds = [];
      
      // 记录用户生成行为
      await user.recordGeneration();

      // 批量创建视频记录
      for (let i = 0; i < batchSize; i++) {
        const video = new Video({
          userId,
          prompt: params.prompt,
          model: generationType,
          duration: params.duration || 5,
          parameters: {
            aspectRatio: params.aspectRatio || '16:9',
            fps: params.fps || 24,
            quality: params.quality || 'medium'
          },
          pointsCost: singleVideoPoints,
          status: 'pending',
          moderationStatus: moderationResult.flagged ? 'rejected' : 'approved',
          moderationResult: moderationResult
        });

        await video.save();
        videoIds.push(video._id);
        
        // 异步处理视频生成
        this.generateVideoAsync(video._id, params, generationType);
      }

      // 扣除用户积分并记录
      await User.findByIdAndUpdate(userId, {
        $inc: { points: -requiredPoints }
      });

      // 记录积分变动
      for (const videoId of videoIds) {
        await user.recordPointsChange('spend', -singleVideoPoints, '视频生成', videoId);
      }

      // 更新热门提示词统计
      await this.updateHotPrompt(params.prompt);

      return {
        success: true,
        data: {
          videoIds,
          batchSize,
          status: 'processing',
          message: i18nService.getMessage('video.generation_started', user.preferences?.language)
        }
      };
    } catch (error) {
      console.error('视频生成处理错误:', error);
      throw error;
    }
  }

  // 异步生成视频
  async generateVideoAsync(videoId, params, generationType) {
    let video = null;
    let user = null;
    
    try {
      video = await Video.findById(videoId);
      if (!video) {
        console.error(`视频记录不存在: ${videoId}`);
        return;
      }

      user = await User.findById(video.userId);
      if (!user) {
        console.error(`用户不存在: ${video.userId}`);
        return;
      }

      // 更新视频状态为处理中
      await video.updateStatus('processing');

      let result;
      
      if (generationType === 'veo-3') {
        result = await this.generateVeo3Video(params);
      } else if (generationType === 'wan-i2v') {
        result = await this.generateWanI2V(params);
      } else if (generationType === 'wan-t2v') {
        result = await this.generateWanT2V(params);
      }

      if (result.success && result.data.video_url) {
        // 上传视频到 OSS
        const videoUrl = await ossService.uploadFromUrl(result.data.video_url, 'videos');
        
        // 生成标题和封面
        const title = await openaiService.generateTitle(params.prompt);
        const thumbnailUrl = await this.generateCover(result.data.video_url, title);

        // 生成签名下载链接
        const signedUrlResult = await signedUrlService.updateVideoSignedUrl(videoId, video.userId, true);

        // 更新视频记录
        await video.updateStatus('completed', {
          videoUrl,
          thumbnailUrl
        });

        await Video.findByIdAndUpdate(videoId, {
          title,
          videoUrl,
          thumbnailUrl,
          signedUrl: signedUrlResult.signedUrl,
          signedUrlExpiry: signedUrlResult.expiryTime
        });

        // 完成用户并发任务
        await user.completeGeneration();

        // 发送成功通知
        await notificationService.notifyVideoCompleted(user, video);

        console.log(`视频 ${videoId} 生成成功`);
      } else {
        // 生成失败，处理退款和重试
        await this.handleVideoFailure(video, user, result.error || '视频生成失败');
      }
    } catch (error) {
      console.error('异步视频生成错误:', error);
      
      if (video && user) {
        await this.handleVideoFailure(video, user, error.message);
      }
    }
  }

  // 处理视频生成失败
  async handleVideoFailure(video, user, errorMessage) {
    try {
      // 检查是否可以重试
      if (video.canRetry()) {
        console.log(`视频 ${video._id} 可以重试，当前重试次数: ${video.retryCount}`);
        
        // 增加重试次数但不立即重试，由定时任务处理
        await video.incrementRetry();
        
        // 标记为失败，等待重试
        await video.updateStatus('failed', { errorMessage });
      } else {
        // 无法重试，最终失败
        await video.updateStatus('failed', { errorMessage });
        
        // 退还积分
        const refunded = await video.refundPoints('生成失败');
        if (refunded) {
          // 记录退款
          await user.recordPointsChange('refund', video.pointsCost, '生成失败退款', video._id);
          console.log(`视频 ${video._id} 积分退还成功: ${video.pointsCost}`);
        }

        // 发送失败通知
        await notificationService.notifyVideoFailed(user, video);
      }

      // 完成用户并发任务
      await user.completeGeneration();
      
    } catch (error) {
      console.error('处理视频失败时出错:', error);
    }
  }

  // 生成封面
  async generateCover(videoUrl, title) {
    try {
      // 这里应该实现视频首帧截图 + 标题叠加的逻辑
      // 简化实现，直接返回视频缩略图
      const coverUrl = await ossService.generateThumbnail(videoUrl, title);
      return coverUrl;
    } catch (error) {
      console.error('封面生成错误:', error);
      return '';
    }
  }

  // 更新热门提示词
  async updateHotPrompt(prompt) {
    try {
      await HotPrompt.findOneAndUpdate(
        { prompt },
        { 
          $inc: { usageCount: 1 },
          $set: { lastUsed: new Date() }
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('更新热门提示词错误:', error);
    }
  }

  // 获取用户视频列表
  async getUserVideos(userId, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const videos = await Video.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v');

      const total = await Video.countDocuments({ userId });

      return {
        success: true,
        data: {
          videos,
          pagination: {
            current: page,
            total: Math.ceil(total / limit),
            count: total
          }
        }
      };
    } catch (error) {
      console.error('获取用户视频列表错误:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 获取视频详情
  async getVideoById(videoId, userId) {
    try {
      const video = await Video.findOne({ _id: videoId, userId });
      
      if (!video) {
        return {
          success: false,
          error: '视频不存在或无权访问'
        };
      }

      return {
        success: true,
        data: video
      };
    } catch (error) {
      console.error('获取视频详情错误:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new VideoService(); 