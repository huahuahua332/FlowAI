const express = require('express');
const User = require('../models/User');
const Video = require('../models/Video');
const Config = require('../models/Config');
const moderationService = require('../services/moderationService');
const notificationService = require('../services/notificationService');
const i18nService = require('../services/i18nService');

const router = express.Router();

// 管理员权限检查中间件
const requireAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '需要登录'
      });
    }

    const token = authHeader.substring(7);
    
    // 简单的管理员token验证 (实际项目中应该使用JWT或数据库验证)
    if (!token.startsWith('admin_token_')) {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }

    // 模拟管理员用户信息
    req.user = {
      id: 'admin',
      name: '管理员',
      email: 'admin@visualforge.com',
      role: 'admin'
    };

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '权限验证失败'
    });
  }
};

// 管理员登录
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 简单的管理员验证 (实际项目中应该使用加密密码和数据库验证)
    const adminCredentials = {
      email: 'admin@visualforge.com',
      password: 'admin123456'
    };
    
    if (email !== adminCredentials.email || password !== adminCredentials.password) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      });
    }
    
    // 生成管理员token
    const adminToken = `admin_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    res.json({
      success: true,
      message: '登录成功',
      data: {
        token: adminToken,
        user: {
          id: 'admin',
          name: '管理员',
          email: 'admin@visualforge.com',
          role: 'admin'
        }
      }
    });
  } catch (error) {
    console.error('管理员登录失败:', error);
    res.status(500).json({
      success: false,
      message: '登录失败'
    });
  }
});

// 仪表板数据
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      totalVideos,
      todayUsers,
      todayVideos,
      recentUsers,
      recentVideos
    ] = await Promise.all([
      User.countDocuments(),
      Video.countDocuments(),
      User.countDocuments({
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }),
      Video.countDocuments({
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }),
      User.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select('name email avatar subscriptionLevel createdAt'),
      Video.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'name email')
        .select('title prompt status duration createdAt')
    ]);

    // 用户订阅分布
    const subscriptionStats = await User.aggregate([
      {
        $group: {
          _id: '$subscriptionLevel',
          count: { $sum: 1 }
        }
      }
    ]);

    // 每日新增用户统计 (最近7天)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyUserStats = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 视频生成统计
    const videoStats = await Video.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalVideos,
          todayUsers,
          todayVideos
        },
        subscriptionStats,
        dailyUserStats,
        videoStats,
        recentUsers,
        recentVideos
      }
    });
  } catch (error) {
    console.error('获取仪表板数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取仪表板数据失败'
    });
  }
});

// 1. GET /api/admin/users - 查询所有用户
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const subscriptionLevel = req.query.subscriptionLevel || '';

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (subscriptionLevel) {
      query.subscriptionLevel = subscriptionLevel;
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('_id email name createdAt points subscriptionLevel avatar')
        .lean(),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        users: users.map(user => ({
          id: user._id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
          points: user.points || 0,
          subscriptionLevel: user.subscriptionLevel || 'free',
          avatar: user.avatar
        })),
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败'
    });
  }
});

// 2. POST /api/admin/users/:id/credits - 调整用户积分
router.post('/users/:id/credits', requireAdmin, async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.params.id;

    if (!amount || typeof amount !== 'number') {
      return res.status(400).json({
        success: false,
        message: '积分数量必须是数字'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 更新积分，确保不会变成负数
    const newPoints = Math.max(0, (user.points || 0) + amount);
    user.points = newPoints;
    await user.save();

    // 记录积分变动日志（可选）
    console.log(`管理员调整用户积分: 用户${user.email}, 变动${amount}, 当前${newPoints}`);

    res.json({
      success: true,
      message: `积分${amount > 0 ? '增加' : '减少'}成功`,
      data: {
        userId: user._id,
        email: user.email,
        name: user.name,
        oldPoints: (user.points || 0) - amount,
        newPoints: newPoints,
        changeAmount: amount
      }
    });
  } catch (error) {
    console.error('调整用户积分失败:', error);
    res.status(500).json({
      success: false,
      message: '调整用户积分失败'
    });
  }
});

// 更新用户订阅等级
router.put('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { subscriptionLevel } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { subscriptionLevel },
      { new: true }
    ).select('_id email name subscriptionLevel points');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      message: '用户信息更新成功',
      data: { user }
    });
  } catch (error) {
    console.error('更新用户失败:', error);
    res.status(500).json({
      success: false,
      message: '更新用户失败'
    });
  }
});

// 3. GET /api/admin/videos - 查询所有视频生成记录
router.get('/videos', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status || '';
    const userId = req.query.userId || '';
    const model = req.query.model || '';

    const query = {};
    if (status) {
      query.status = status;
    }
    if (userId) {
      query.userId = userId;
    }
    if (model) {
      query.model = { $regex: model, $options: 'i' };
    }

    const [videos, total] = await Promise.all([
      Video.find(query)
        .populate('userId', 'name email avatar')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('_id title prompt model duration status videoUrl thumbnailUrl createdAt updatedAt')
        .lean(),
      Video.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        videos: videos.map(video => ({
          id: video._id,
          title: video.title || '未命名视频',
          prompt: video.prompt,
          model: video.model || 'unknown',
          duration: video.duration || 0,
          status: video.status || 'pending',
          videoUrl: video.videoUrl,
          thumbnailUrl: video.thumbnailUrl,
          createdAt: video.createdAt,
          updatedAt: video.updatedAt,
          user: video.userId ? {
            id: video.userId._id,
            name: video.userId.name,
            email: video.userId.email,
            avatar: video.userId.avatar
          } : null
        })),
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('获取视频列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取视频列表失败'
    });
  }
});

// 4. DELETE /api/admin/videos/:id - 删除指定视频记录
router.delete('/videos/:id', requireAdmin, async (req, res) => {
  try {
    const videoId = req.params.id;

    // 查找视频记录
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: '视频记录不存在'
      });
    }

    // TODO: 这里应该添加删除OSS文件的逻辑
    // 示例：
    // if (video.videoUrl) {
    //   await deleteOSSFile(video.videoUrl);
    // }
    // if (video.thumbnailUrl) {
    //   await deleteOSSFile(video.thumbnailUrl);
    // }

    // 删除数据库记录
    await Video.findByIdAndDelete(videoId);

    // 记录删除日志
    console.log(`管理员删除视频: ID=${videoId}, 标题=${video.title}, 用户=${video.userId}`);

    res.json({
      success: true,
      message: '视频删除成功',
      data: {
        deletedVideoId: videoId,
        title: video.title,
        prompt: video.prompt
      }
    });
  } catch (error) {
    console.error('删除视频失败:', error);
    res.status(500).json({
      success: false,
      message: '删除视频失败'
    });
  }
});

// 系统配置管理
router.get('/config', requireAdmin, async (req, res) => {
  try {
    const configs = await Config.find().sort({ category: 1, key: 1 });
    res.json({
      success: true,
      data: { configs }
    });
  } catch (error) {
    console.error('获取系统配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取系统配置失败'
    });
  }
});

// 更新系统配置
router.put('/config/:key', requireAdmin, async (req, res) => {
  try {
    const { value } = req.body;
    const config = await Config.findOneAndUpdate(
      { key: req.params.key },
      { value },
      { new: true }
    );

    if (!config) {
      return res.status(404).json({
        success: false,
        message: '配置项不存在'
      });
    }

    res.json({
      success: true,
      data: { config }
    });
  } catch (error) {
    console.error('更新系统配置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新系统配置失败'
    });
  }
});

// 获取系统概览统计
router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 用户统计
    const userStats = {
      total: await User.countDocuments(),
      today: await User.countDocuments({ createdAt: { $gte: today } }),
      thisWeek: await User.countDocuments({ createdAt: { $gte: thisWeek } }),
      thisMonth: await User.countDocuments({ createdAt: { $gte: thisMonth } }),
      bySubscription: await User.aggregate([
        { $group: { _id: '$subscriptionLevel', count: { $sum: 1 } } }
      ]),
      byRiskStatus: await User.aggregate([
        { $group: { _id: '$riskProfile.status', count: { $sum: 1 } } }
      ])
    };

    // 视频统计
    const videoStats = {
      total: await Video.countDocuments(),
      today: await Video.countDocuments({ createdAt: { $gte: today } }),
      thisWeek: await Video.countDocuments({ createdAt: { $gte: thisWeek } }),
      thisMonth: await Video.countDocuments({ createdAt: { $gte: thisMonth } }),
      byStatus: await Video.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      byModel: await Video.aggregate([
        { $group: { _id: '$model', count: { $sum: 1 } } }
      ]),
      byModerationStatus: await Video.aggregate([
        { $group: { _id: '$moderationStatus', count: { $sum: 1 } } }
      ])
    };

    // 积分统计
    const pointsStats = await Video.aggregate([
      {
        $group: {
          _id: null,
          totalSpent: { $sum: '$pointsCost' },
          totalRefunded: { $sum: '$refundAmount' },
          avgPointsPerVideo: { $avg: '$pointsCost' }
        }
      }
    ]);

    // 错误统计
    const errorStats = await Video.aggregate([
      { $match: { status: 'failed' } },
      { $group: { _id: '$errorMessage', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        users: userStats,
        videos: videoStats,
        points: pointsStats[0] || { totalSpent: 0, totalRefunded: 0, avgPointsPerVideo: 0 },
        errors: errorStats
      }
    });
  } catch (error) {
    console.error('获取管理员概览失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 用户管理 - 获取用户列表
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const filter = {};
    if (req.query.subscriptionLevel) {
      filter.subscriptionLevel = req.query.subscriptionLevel;
    }
    if (req.query.riskStatus) {
      filter['riskProfile.status'] = req.query.riskStatus;
    }
    if (req.query.search) {
      filter.$or = [
        { email: { $regex: req.query.search, $options: 'i' } },
        { name: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-loginHistory -pointsHistory')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: total
        }
      }
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 用户管理 - 获取用户详情
router.get('/users/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // 获取用户的视频统计
    const videoStats = await Video.aggregate([
      { $match: { userId: user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalPoints: { $sum: '$pointsCost' }
        }
      }
    ]);

    // 获取最近的视频
    const recentVideos = await Video.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title prompt status createdAt pointsCost');

    res.json({
      success: true,
      data: {
        user,
        videoStats,
        recentVideos
      }
    });
  } catch (error) {
    console.error('获取用户详情失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 用户管理 - 更新用户状态
router.put('/users/:userId/status', async (req, res) => {
  try {
    const { status, reason, expiryDays } = req.body;
    
    const updateData = {
      'riskProfile.status': status,
      'riskProfile.restrictionReason': reason
    };

    if (expiryDays && status === 'restricted') {
      updateData['riskProfile.restrictionExpiry'] = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      updateData,
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // 发送通知
    if (status === 'restricted' || status === 'banned') {
      await notificationService.notifyAccountRestricted(user);
    }

    res.json({
      success: true,
      message: i18nService.getMessage(`admin.user_${status === 'banned' ? 'banned' : 'restricted'}`),
      data: user
    });
  } catch (error) {
    console.error('更新用户状态失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 用户管理 - 调整用户积分
router.put('/users/:userId/points', async (req, res) => {
  try {
    const { amount, reason } = req.body;
    
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // 更新积分
    user.points += amount;
    await user.save();

    // 记录积分变动
    await user.recordPointsChange('admin_adjust', amount, reason || '管理员调整');

    res.json({
      success: true,
      message: '积分调整成功',
      data: { newBalance: user.points }
    });
  } catch (error) {
    console.error('调整用户积分失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 视频管理 - 获取视频列表
router.get('/videos', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.model) {
      filter.model = req.query.model;
    }
    if (req.query.moderationStatus) {
      filter.moderationStatus = req.query.moderationStatus;
    }
    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { prompt: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const videos = await Video.find(filter)
      .populate('userId', 'email name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Video.countDocuments(filter);

    res.json({
      success: true,
      data: {
        videos,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: total
        }
      }
    });
  } catch (error) {
    console.error('获取视频列表失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 视频管理 - 删除视频
router.delete('/videos/:videoId', async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId);
    if (!video) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }

    // 如果视频已完成且未退款，需要退还积分
    if (video.status === 'completed' && !video.refunded) {
      const refunded = await video.refundPoints('管理员删除');
      if (refunded) {
        const user = await User.findById(video.userId);
        if (user) {
          await user.recordPointsChange('refund', video.pointsCost, '管理员删除视频退款', video._id);
        }
      }
    }

    await Video.findByIdAndDelete(req.params.videoId);

    res.json({
      success: true,
      message: i18nService.getMessage('admin.video_deleted')
    });
  } catch (error) {
    console.error('删除视频失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 内容审核 - 获取待审核内容
router.get('/moderation/pending', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const videos = await Video.find({
      moderationStatus: { $in: ['pending', 'reviewing'] }
    })
    .populate('userId', 'email name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    const total = await Video.countDocuments({
      moderationStatus: { $in: ['pending', 'reviewing'] }
    });

    res.json({
      success: true,
      data: {
        videos,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: total
        }
      }
    });
  } catch (error) {
    console.error('获取待审核内容失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 内容审核 - 审核决定
router.put('/moderation/:videoId', async (req, res) => {
  try {
    const { decision, reason } = req.body; // decision: 'approved' | 'rejected'
    
    const video = await Video.findById(req.params.videoId);
    if (!video) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }

    video.moderationStatus = decision;
    video.moderationResult.reviewedAt = new Date();
    video.moderationResult.reviewerId = 'admin'; // 实际应该是管理员ID

    if (decision === 'rejected') {
      video.status = 'failed';
      video.errorMessage = reason || '内容审核不通过';
      
      // 退还积分
      const refunded = await video.refundPoints('内容审核不通过');
      if (refunded) {
        const user = await User.findById(video.userId);
        if (user) {
          await user.recordPointsChange('refund', video.pointsCost, '内容审核不通过退款', video._id);
          
          // 发送通知
          await notificationService.notifyVideoFailed(user, video);
        }
      }
    }

    await video.save();

    res.json({
      success: true,
      message: i18nService.getMessage(`admin.content_${decision}`)
    });
  } catch (error) {
    console.error('内容审核失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取审核统计
router.get('/moderation/stats', async (req, res) => {
  try {
    const timeRange = req.query.timeRange || '7d';
    const stats = await moderationService.getModerationStats(timeRange);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取审核统计失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 系统配置 - 获取配置
router.get('/config', async (req, res) => {
  try {
    const configs = await Config.find();
    const configMap = {};
    
    configs.forEach(config => {
      configMap[config.key] = config.value;
    });

    res.json({
      success: true,
      data: configMap
    });
  } catch (error) {
    console.error('获取系统配置失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 系统配置 - 更新配置
router.put('/config', async (req, res) => {
  try {
    const updates = req.body;
    
    for (const [key, value] of Object.entries(updates)) {
      await Config.findOneAndUpdate(
        { key },
        { key, value, updatedAt: new Date() },
        { upsert: true }
      );
    }

    res.json({
      success: true,
      message: i18nService.getMessage('admin.stats_updated')
    });
  } catch (error) {
    console.error('更新系统配置失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 批量操作 - 批量删除视频
router.post('/videos/batch-delete', async (req, res) => {
  try {
    const { videoIds } = req.body;
    
    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid video IDs' });
    }

    const videos = await Video.find({ _id: { $in: videoIds } });
    let refundCount = 0;

    // 处理每个视频的退款
    for (const video of videos) {
      if (video.status === 'completed' && !video.refunded) {
        const refunded = await video.refundPoints('管理员批量删除');
        if (refunded) {
          refundCount++;
          const user = await User.findById(video.userId);
          if (user) {
            await user.recordPointsChange('refund', video.pointsCost, '管理员批量删除视频退款', video._id);
          }
        }
      }
    }

    // 批量删除
    await Video.deleteMany({ _id: { $in: videoIds } });

    res.json({
      success: true,
      message: `成功删除 ${videos.length} 个视频，退款 ${refundCount} 个`,
      data: { deleted: videos.length, refunded: refundCount }
    });
  } catch (error) {
    console.error('批量删除视频失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 导出数据
router.get('/export/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);
    
    let data = [];
    
    if (type === 'users') {
      data = await User.find(dateFilter.createdAt ? { createdAt: dateFilter } : {})
        .select('email name subscriptionLevel points createdAt riskProfile.status')
        .lean();
    } else if (type === 'videos') {
      data = await Video.find(dateFilter.createdAt ? { createdAt: dateFilter } : {})
        .populate('userId', 'email')
        .select('title prompt model status pointsCost createdAt')
        .lean();
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('导出数据失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router; 