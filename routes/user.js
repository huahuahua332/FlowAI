const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const Config = require('../models/Config');

const router = express.Router();

// 每日签到
router.post('/signin', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 检查今日是否已签到
    if (user.lastSigninDate && user.lastSigninDate >= today) {
      return res.status(400).json({
        success: false,
        message: '今日已签到，请明天再来'
      });
    }

    // 检查是否需要重置月度签到
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    let monthlyDays = user.monthlySigninDays || 0;
    if (!user.signinResetDate || user.signinResetDate < currentMonth) {
      monthlyDays = 0; // 重置月度签到天数
    }

    // 计算连续签到天数
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let consecutiveDays = user.consecutiveSigninDays;
    if (user.lastSigninDate && user.lastSigninDate >= yesterday) {
      consecutiveDays += 1;
    } else {
      consecutiveDays = 1; // 重新开始计算
    }

    monthlyDays += 1;

    // 获取签到奖励配置
    const dailyPoints = await Config.getValue('daily_signin_points', 2);
    const weeklyBonus = await Config.getValue('weekly_signin_bonus', 5);
    const monthlyBonus = await Config.getValue('monthly_signin_bonus', 12);
    
    let pointsEarned = dailyPoints;
    let bonusMessage = '';
    
    // 检查是否获得连续7天奖励
    if (consecutiveDays % 7 === 0) {
      pointsEarned += weeklyBonus;
      bonusMessage += `连续7天奖励 ${weeklyBonus} 积分！`;
    }

    // 检查是否获得月度25天奖励
    if (monthlyDays === 25) {
      pointsEarned += monthlyBonus;
      bonusMessage += `月度25天奖励 ${monthlyBonus} 积分！`;
    }

    // 更新用户数据
    await User.findByIdAndUpdate(user._id, {
      $inc: { points: pointsEarned },
      lastSigninDate: new Date(),
      consecutiveSigninDays: consecutiveDays,
      monthlySigninDays: monthlyDays,
      signinResetDate: currentMonth
    });

    res.json({
      success: true,
      data: {
        pointsEarned,
        consecutiveDays,
        monthlyDays,
        totalPoints: user.points + pointsEarned,
        bonusMessage,
        message: `签到成功！获得 ${pointsEarned} 积分 ${bonusMessage}`
      }
    });
  } catch (error) {
    console.error('签到错误:', error);
    res.status(500).json({
      success: false,
      message: '签到失败，请稍后重试'
    });
  }
});

// 获取签到状态
router.get('/signin-status', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const hasSignedToday = user.lastSigninDate && user.lastSigninDate >= today;
    
    // 检查月度重置
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let monthlyDays = user.monthlySigninDays || 0;
    if (!user.signinResetDate || user.signinResetDate < currentMonth) {
      monthlyDays = 0;
    }
    
    res.json({
      success: true,
      data: {
        hasSignedToday,
        consecutiveDays: user.consecutiveSigninDays,
        monthlyDays,
        lastSigninDate: user.lastSigninDate,
        nextWeeklyReward: 7 - (user.consecutiveSigninDays % 7),
        nextMonthlyReward: Math.max(0, 25 - monthlyDays),
        rewards: {
          daily: 2,
          weekly: 5,
          monthly: 12
        }
      }
    });
  } catch (error) {
    console.error('获取签到状态错误:', error);
    res.status(500).json({
      success: false,
      message: '获取签到状态失败'
    });
  }
});

// 获取用户统计信息
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    // 计算今日生成次数
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayGenerations = user.generatedHistory.filter(
      item => item.generatedAt >= today
    ).length;

    // 计算总生成次数
    const totalGenerations = user.generatedHistory.length;

    // 计算本月积分消耗
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const monthlyPointsUsed = user.generatedHistory
      .filter(item => item.generatedAt >= thisMonth)
      .reduce((total, item) => total + item.pointsUsed, 0);

    // 获取订阅限制
    const subscriptionLimits = await Config.getValue('subscription_limits');
    const effectiveLevel = user.getEffectiveSubscriptionLevel();
    const userLimits = subscriptionLimits[effectiveLevel];

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          points: user.points,
          subscriptionLevel: user.subscriptionLevel,
          effectiveLevel,
          subscriptionExpiry: user.subscriptionExpiry,
          isSubscriptionActive: user.isSubscriptionActive()
        },
        stats: {
          todayGenerations,
          totalGenerations,
          monthlyPointsUsed,
          consecutiveSigninDays: user.consecutiveSigninDays
        },
        limits: userLimits
      }
    });
  } catch (error) {
    console.error('获取用户统计错误:', error);
    res.status(500).json({
      success: false,
      message: '获取用户统计失败'
    });
  }
});

// 更新用户资料
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const updateData = {};

    if (name && name.trim().length > 0) {
      updateData.name = name.trim();
    }

    if (avatar && avatar.trim().length > 0) {
      updateData.avatar = avatar.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有提供有效的更新数据'
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    ).select('-__v');

    res.json({
      success: true,
      data: {
        user: updatedUser
      },
      message: '资料更新成功'
    });
  } catch (error) {
    console.error('更新用户资料错误:', error);
    res.status(500).json({
      success: false,
      message: '更新资料失败'
    });
  }
});

// 获取积分历史
router.get('/points-history', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const user = await User.findById(req.user._id)
      .populate({
        path: 'generatedHistory.videoId',
        select: 'prompt title status createdAt'
      });

    const history = user.generatedHistory
      .sort((a, b) => b.generatedAt - a.generatedAt)
      .slice(skip, skip + limit);

    const total = user.generatedHistory.length;

    res.json({
      success: true,
      data: {
        history,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: total
        }
      }
    });
  } catch (error) {
    console.error('获取积分历史错误:', error);
    res.status(500).json({
      success: false,
      message: '获取积分历史失败'
    });
  }
});

module.exports = router; 