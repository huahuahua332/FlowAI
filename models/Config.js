const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['system', 'points', 'payment', 'ai', 'ui']
  },
  dataType: {
    type: String,
    required: true,
    enum: ['string', 'number', 'boolean', 'json'],
    default: 'string'
  },
  isEditable: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// 索引
configSchema.index({ category: 1, key: 1 });

// 更新时间中间件
configSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 静态方法：获取配置值
configSchema.statics.getValue = async function(key, defaultValue = null) {
  const config = await this.findOne({ key });
  return config ? config.value : defaultValue;
};

// 静态方法：设置配置值
configSchema.statics.setValue = async function(key, value, description = '') {
  return await this.findOneAndUpdate(
    { key },
    { value, description, updatedAt: Date.now() },
    { upsert: true, new: true }
  );
};

module.exports = mongoose.model('Config', configSchema); 