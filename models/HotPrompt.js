const mongoose = require('mongoose');

const hotPromptSchema = new mongoose.Schema({
  prompt: {
    type: String,
    required: true,
    unique: true
  },
  usageCount: {
    type: Number,
    required: true,
    default: 0
  },
  lastUsed: {
    type: Date,
    default: Date.now
  },
  category: {
    type: String,
    default: 'general'
  },
  tags: [{
    type: String
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

// 更新时间中间件
hotPromptSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 索引优化
hotPromptSchema.index({ usageCount: -1 });
hotPromptSchema.index({ lastUsed: -1 });

module.exports = mongoose.model('HotPrompt', hotPromptSchema); 