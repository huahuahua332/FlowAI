const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: ''
  },
  subscriptionLevel: {
    type: String,
    enum: ['free', 'plus', 'pro', 'flagship'],
    default: 'free'
  },
  points: {
    type: Number,
    default: 30 // 新用户赠送30积分
  },
  lastSigninDate: {
    type: Date,
    default: null
  },
  consecutiveSigninDays: {
    type: Number,
    default: 0
  },
  monthlySigninDays: {
    type: Number,
    default: 0
  },
  signinResetDate: {
    type: Date,
    default: null
  },
  generatedHistory: [{
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video'
    },
    generatedAt: {
      type: Date,
      default: Date.now
    },
    pointsUsed: {
      type: Number,
      required: true
    }
  }],
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  subscriptionExpiry: {
    type: Date,
    default: null
  },
  subscriptionId: {
    type: String,
    default: null
  },
  // 用户偏好设置
  preferences: {
    language: {
      type: String,
      enum: ['zh-CN', 'en-US', 'ja-JP', 'ko-KR'],
      default: 'zh-CN'
    },
    timezone: {
      type: String,
      default: 'Asia/Shanghai'
    },
    emailNotifications: {
      type: Boolean,
      default: true
    },
    webhookUrl: {
      type: String,
      default: null
    }
  },
  // 风控相关
  riskProfile: {
    trustScore: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },
    status: {
      type: String,
      enum: ['normal', 'warning', 'restricted', 'banned'],
      default: 'normal'
    },
    restrictionReason: {
      type: String,
      default: null
    },
    restrictionExpiry: {
      type: Date,
      default: null
    }
  },
  // 设备和IP记录
  loginHistory: [{
    ip: String,
    userAgent: String,
    location: {
      country: String,
      city: String,
      region: String
    },
    deviceFingerprint: String,
    loginAt: {
      type: Date,
      default: Date.now
    },
    success: {
      type: Boolean,
      default: true
    }
  }],
  // 并发控制
  concurrentTasks: {
    current: {
      type: Number,
      default: 0
    },
    max: {
      type: Number,
      default: function() {
        switch(this.subscriptionLevel) {
          case 'free': return 1;
          case 'plus': return 3;
          case 'pro': return 5;
          case 'flagship': return 10;
          default: return 1;
        }
      }
    }
  },
  // 限频控制
  rateLimiting: {
    lastGenerationAt: {
      type: Date,
      default: null
    },
    generationCount: {
      hourly: { type: Number, default: 0 },
      daily: { type: Number, default: 0 },
      monthly: { type: Number, default: 0 }
    },
    resetTimes: {
      hourly: { type: Date, default: null },
      daily: { type: Date, default: null },
      monthly: { type: Date, default: null }
    }
  },
  // 积分流水记录
  pointsHistory: [{
    type: {
      type: String,
      enum: ['earn', 'spend', 'refund', 'admin_adjust'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    balance: {
      type: Number,
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    relatedVideoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      default: null
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 索引
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ subscriptionLevel: 1 });
userSchema.index({ 'riskProfile.status': 1 });
userSchema.index({ 'loginHistory.ip': 1 });
userSchema.index({ 'loginHistory.loginAt': -1 });
userSchema.index({ createdAt: -1 });

// 更新时间中间件
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 检查订阅是否有效
userSchema.methods.isSubscriptionActive = function() {
  if (this.subscriptionLevel === 'free') return true;
  return this.subscriptionExpiry && this.subscriptionExpiry > new Date();
};

// 获取有效订阅等级
userSchema.methods.getEffectiveSubscriptionLevel = function() {
  if (this.isSubscriptionActive()) {
    return this.subscriptionLevel;
  }
  return 'free';
};

// 检查是否可以生成视频（并发控制）
userSchema.methods.canGenerateVideo = function() {
  if (this.riskProfile.status === 'banned' || this.riskProfile.status === 'restricted') {
    return { allowed: false, reason: 'account_restricted' };
  }
  
  if (this.concurrentTasks.current >= this.concurrentTasks.max) {
    return { allowed: false, reason: 'concurrent_limit_exceeded' };
  }
  
  return { allowed: true };
};

// 检查生成频率限制
userSchema.methods.checkRateLimit = function() {
  const now = new Date();
  const subscriptionLevel = this.getEffectiveSubscriptionLevel();
  
  // 获取限制配置
  const limits = {
    free: { interval: 3 * 60 * 1000, hourly: 5, daily: 20 }, // 3分钟间隔，每小时5次，每天20次
    plus: { interval: 60 * 1000, hourly: 20, daily: 100 }, // 1分钟间隔
    pro: { interval: 30 * 1000, hourly: 50, daily: 300 }, // 30秒间隔
    flagship: { interval: 0, hourly: 200, daily: 1000 } // 无间隔限制
  };
  
  const limit = limits[subscriptionLevel];
  
  // 检查间隔限制
  if (this.rateLimiting.lastGenerationAt && limit.interval > 0) {
    const timeSinceLastGeneration = now - this.rateLimiting.lastGenerationAt;
    if (timeSinceLastGeneration < limit.interval) {
      const waitTime = Math.ceil((limit.interval - timeSinceLastGeneration) / 1000);
      return { allowed: false, reason: 'rate_limit_interval', waitTime };
    }
  }
  
  // 检查小时限制
  if (this.rateLimiting.resetTimes.hourly && now > this.rateLimiting.resetTimes.hourly) {
    this.rateLimiting.generationCount.hourly = 0;
    this.rateLimiting.resetTimes.hourly = new Date(now.getTime() + 60 * 60 * 1000);
  }
  
  if (this.rateLimiting.generationCount.hourly >= limit.hourly) {
    return { allowed: false, reason: 'hourly_limit_exceeded' };
  }
  
  // 检查每日限制
  if (this.rateLimiting.resetTimes.daily && now > this.rateLimiting.resetTimes.daily) {
    this.rateLimiting.generationCount.daily = 0;
    this.rateLimiting.resetTimes.daily = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
  
  if (this.rateLimiting.generationCount.daily >= limit.daily) {
    return { allowed: false, reason: 'daily_limit_exceeded' };
  }
  
  return { allowed: true };
};

// 记录生成行为
userSchema.methods.recordGeneration = function() {
  const now = new Date();
  
  this.rateLimiting.lastGenerationAt = now;
  this.rateLimiting.generationCount.hourly += 1;
  this.rateLimiting.generationCount.daily += 1;
  this.concurrentTasks.current += 1;
  
  // 初始化重置时间
  if (!this.rateLimiting.resetTimes.hourly) {
    this.rateLimiting.resetTimes.hourly = new Date(now.getTime() + 60 * 60 * 1000);
  }
  if (!this.rateLimiting.resetTimes.daily) {
    this.rateLimiting.resetTimes.daily = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
  
  return this.save();
};

// 完成生成任务
userSchema.methods.completeGeneration = function() {
  if (this.concurrentTasks.current > 0) {
    this.concurrentTasks.current -= 1;
  }
  return this.save();
};

// 记录登录信息
userSchema.methods.recordLogin = function(loginInfo) {
  this.loginHistory.push({
    ip: loginInfo.ip,
    userAgent: loginInfo.userAgent,
    location: loginInfo.location || {},
    deviceFingerprint: loginInfo.deviceFingerprint,
    loginAt: new Date(),
    success: loginInfo.success !== false
  });
  
  // 只保留最近100条登录记录
  if (this.loginHistory.length > 100) {
    this.loginHistory = this.loginHistory.slice(-100);
  }
  
  return this.save();
};

// 记录积分变动
userSchema.methods.recordPointsChange = function(type, amount, reason, videoId = null) {
  const newBalance = this.points;
  
  this.pointsHistory.push({
    type,
    amount,
    balance: newBalance,
    reason,
    relatedVideoId: videoId,
    createdAt: new Date()
  });
  
  // 只保留最近1000条积分记录
  if (this.pointsHistory.length > 1000) {
    this.pointsHistory = this.pointsHistory.slice(-1000);
  }
  
  return this.save();
};

// 获取风险评分
userSchema.methods.calculateRiskScore = function() {
  let score = 100;
  
  // 检查IP变化频率
  const recentLogins = this.loginHistory.filter(login => 
    login.loginAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );
  
  const uniqueIPs = new Set(recentLogins.map(login => login.ip));
  if (uniqueIPs.size > 10) score -= 20; // 一周内使用超过10个不同IP
  
  // 检查设备变化
  const uniqueDevices = new Set(recentLogins.map(login => login.deviceFingerprint));
  if (uniqueDevices.size > 5) score -= 15; // 一周内使用超过5个不同设备
  
  // 检查失败登录
  const failedLogins = recentLogins.filter(login => !login.success);
  if (failedLogins.length > 5) score -= 10; // 一周内失败登录超过5次
  
  this.riskProfile.trustScore = Math.max(0, score);
  return score;
};

module.exports = mongoose.model('User', userSchema); 