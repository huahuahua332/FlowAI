const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    default: '未命名视频'
  },
  prompt: {
    type: String,
    required: true
  },
  model: {
    type: String,
    required: true,
    enum: ['veo-3', 'wan-i2v', 'wan-t2v']
  },
  duration: {
    type: Number,
    default: 5 // 默认5秒
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  videoUrl: {
    type: String,
    default: null
  },
  thumbnailUrl: {
    type: String,
    default: null
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 生成参数
  parameters: {
    aspectRatio: {
      type: String,
      default: '16:9'
    },
    fps: {
      type: Number,
      default: 24
    },
    quality: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    }
  },
  // 费用信息
  pointsCost: {
    type: Number,
    default: 0
  },
  // 退款相关
  refunded: {
    type: Boolean,
    default: false
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  refundReason: {
    type: String,
    default: null
  },
  refundedAt: {
    type: Date,
    default: null
  },
  // 重试机制
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  lastRetryAt: {
    type: Date,
    default: null
  },
  // 超时检测
  timeoutAt: {
    type: Date,
    default: null
  },
  maxProcessingTime: {
    type: Number,
    default: 30 * 60 * 1000 // 30分钟，毫秒
  },
  // 内容审核
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'reviewing'],
    default: 'pending'
  },
  moderationResult: {
    flagged: { type: Boolean, default: false },
    categories: [String],
    confidence: { type: Number, default: 0 },
    reviewedAt: { type: Date, default: null },
    reviewerId: { type: String, default: null }
  },
  // 签名下载链接
  signedUrl: {
    type: String,
    default: null
  },
  signedUrlExpiry: {
    type: Date,
    default: null
  },
  // 错误信息
  errorMessage: {
    type: String,
    default: null
  },
  // 处理时间
  processingStartedAt: {
    type: Date,
    default: null
  },
  processingCompletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// 索引
videoSchema.index({ userId: 1, createdAt: -1 });
videoSchema.index({ status: 1 });
videoSchema.index({ model: 1 });
videoSchema.index({ createdAt: -1 });
videoSchema.index({ moderationStatus: 1 });
videoSchema.index({ processingStartedAt: 1, status: 1 });
videoSchema.index({ signedUrlExpiry: 1 });

// 虚拟字段：处理时长
videoSchema.virtual('processingDuration').get(function() {
  if (this.processingStartedAt && this.processingCompletedAt) {
    return Math.round((this.processingCompletedAt - this.processingStartedAt) / 1000);
  }
  return null;
});

// 虚拟字段：是否超时
videoSchema.virtual('isTimeout').get(function() {
  if (this.status === 'processing' && this.processingStartedAt) {
    const now = new Date();
    const processingTime = now - this.processingStartedAt;
    return processingTime > this.maxProcessingTime;
  }
  return false;
});

// 实例方法：更新状态
videoSchema.methods.updateStatus = function(status, options = {}) {
  this.status = status;
  
  if (status === 'processing' && !this.processingStartedAt) {
    this.processingStartedAt = new Date();
    // 设置超时时间
    this.timeoutAt = new Date(Date.now() + this.maxProcessingTime);
  }
  
  if (status === 'completed' || status === 'failed') {
    if (!this.processingCompletedAt) {
      this.processingCompletedAt = new Date();
    }
    
    if (status === 'completed' && options.videoUrl) {
      this.videoUrl = options.videoUrl;
      this.thumbnailUrl = options.thumbnailUrl;
    }
    
    if (status === 'failed' && options.errorMessage) {
      this.errorMessage = options.errorMessage;
    }
  }
  
  return this.save();
};

// 实例方法：退还积分
videoSchema.methods.refundPoints = async function(reason = '生成失败') {
  if (this.refunded) {
    return false; // 已经退款过了
  }
  
  const User = require('./User');
  
  try {
    // 退还积分给用户
    await User.findByIdAndUpdate(this.userId, {
      $inc: { points: this.pointsCost }
    });
    
    // 更新退款状态
    this.refunded = true;
    this.refundAmount = this.pointsCost;
    this.refundReason = reason;
    this.refundedAt = new Date();
    
    await this.save();
    return true;
  } catch (error) {
    console.error('退款失败:', error);
    return false;
  }
};

// 实例方法：检查是否可以重试
videoSchema.methods.canRetry = function() {
  return this.retryCount < this.maxRetries && this.status === 'failed';
};

// 实例方法：增加重试次数
videoSchema.methods.incrementRetry = function() {
  this.retryCount += 1;
  this.lastRetryAt = new Date();
  return this.save();
};

// 静态方法：获取用户视频统计
videoSchema.statics.getUserStats = function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalDuration: { $sum: '$duration' },
        totalPoints: { $sum: '$pointsCost' }
      }
    }
  ]);
};

// 静态方法：获取模型使用统计
videoSchema.statics.getModelStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$model',
        count: { $sum: 1 },
        totalDuration: { $sum: '$duration' },
        avgDuration: { $avg: '$duration' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// 静态方法：查找超时的视频
videoSchema.statics.findTimeoutVideos = function() {
  const now = new Date();
  return this.find({
    status: 'processing',
    $or: [
      { timeoutAt: { $lt: now } },
      { 
        processingStartedAt: { $lt: new Date(now - 30 * 60 * 1000) },
        timeoutAt: null
      }
    ]
  });
};

module.exports = mongoose.model('Video', videoSchema); 