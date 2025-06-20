const Config = require('../models/Config');
const Video = require('../models/Video');

// 检查积分和订阅限制的中间件
const checkPoints = async (req, res, next) => {
  try {
    const user = req.user;
    const { duration = 5, generationType = 'wan-i2v', batchSize = 1 } = req.body;

    // 获取当前用户的有效订阅等级
    const effectiveLevel = user.getEffectiveSubscriptionLevel();
    
    // 获取订阅限制配置
    const subscriptionLimits = await Config.getValue('subscription_limits');
    const userLimits = subscriptionLimits[effectiveLevel];

    // 检查是否允许使用该模型
    if (!userLimits.allowedModels.includes(generationType)) {
      const modelNames = {
        'wan-i2v': 'WAN I2V (480p)',
        'wan-t2v': 'WAN T2V (720p)', 
        'veo-3': 'Google Veo-3 (1080p)'
      };
      return res.status(403).json({
        success: false,
        message: `您的订阅等级不支持 ${modelNames[generationType]} 模型，请升级订阅`
      });
    }

    // 检查时长限制
    if (duration > userLimits.maxDuration) {
      return res.status(403).json({
        success: false,
        message: `您的订阅等级最多支持 ${userLimits.maxDuration} 秒视频生成`
      });
    }

    // 检查批量生成限制
    if (batchSize > userLimits.batchSize) {
      return res.status(403).json({
        success: false,
        message: `您的订阅等级最多支持批量生成 ${userLimits.batchSize} 个视频`
      });
    }

    // 检查每月生成次数限制（-1 表示无限制）
    if (userLimits.monthlyGenerations !== -1) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const monthlyGenerations = await Video.countDocuments({
        userId: user._id,
        createdAt: { $gte: startOfMonth }
      });

      if (monthlyGenerations >= userLimits.monthlyGenerations) {
        return res.status(403).json({
          success: false,
          message: `您本月的生成次数已达上限 (${userLimits.monthlyGenerations} 次)，请下月再试或升级订阅`
        });
      }
    }

    // 计算所需积分
    let pointsKey;
    if (generationType === 'veo-3') {
      pointsKey = duration <= 5 ? 'points_veo3_5s' : 'points_veo3_10s';
    } else if (generationType === 'wan-i2v') {
      pointsKey = duration <= 5 ? 'points_wan_i2v_5s' : 'points_wan_i2v_10s';
    } else if (generationType === 'wan-t2v') {
      pointsKey = duration <= 5 ? 'points_wan_t2v_5s' : 'points_wan_t2v_10s';
    } else {
      pointsKey = `points_${generationType}_${duration}s`;
    }
    
    const singleVideoPoints = await Config.getValue(pointsKey, 10);
    const totalRequiredPoints = singleVideoPoints * batchSize;

    // 检查积分是否足够
    if (user.points < totalRequiredPoints) {
      return res.status(403).json({
        success: false,
        message: `积分不足，批量生成${batchSize}个视频需要 ${totalRequiredPoints} 积分，当前积分: ${user.points}`
      });
    }

    // 将所需积分添加到请求对象中，供后续使用
    req.requiredPoints = totalRequiredPoints;
    req.singleVideoPoints = singleVideoPoints;
    req.userLimits = userLimits;
    
    next();
  } catch (error) {
    console.error('积分检查中间件错误:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

module.exports = checkPoints; 