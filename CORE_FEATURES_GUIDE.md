# 核心功能实现指南

本文档详细介绍了视频生成系统新增的10个核心功能的实现和使用方法。

## 📋 功能清单

### ✅ 已实现的核心功能

1. **视频生成失败自动补偿（积分自动退还）**
2. **任务超时检测机制（挂起保护）**
3. **失败任务自动重试机制**
4. **下载链接防盗链 / 有效期签名**
5. **多语言支持（i18n）**
6. **通知服务（Webhook / 邮件）**
7. **内容合规与违规检测（Content Moderation）**
8. **管理后台 API（可视化或自动）**
9. **积分消费限频 / 并发控制**
10. **用户设备与IP记录（风控基础）**

## 🚀 功能详细说明

### 1. 视频生成失败自动补偿

**功能描述**：当视频生成失败时，系统自动退还用户消耗的积分。

**实现位置**：
- `models/Video.js` - 添加退款相关字段和方法
- `services/videoService.js` - 失败处理逻辑

**关键特性**：
- 防止重复退款（`refunded` 字段）
- 详细退款记录（金额、原因、时间）
- 积分流水记录

**使用示例**：
```javascript
// 自动退款
const refunded = await video.refundPoints('生成失败');
if (refunded) {
  await user.recordPointsChange('refund', video.pointsCost, '生成失败退款', video._id);
}
```

### 2. 任务超时检测机制

**功能描述**：检测长时间处于 `processing` 状态的视频，自动标记为失败并退还积分。

**实现位置**：
- `models/Video.js` - 超时检测方法
- `jobs/cronJobs.js` - 定时检查任务

**关键特性**：
- 可配置超时时间（默认30分钟）
- 自动状态更新
- 通知用户

**配置**：
```env
VIDEO_GENERATION_TIMEOUT_MINUTES=30
```

### 3. 失败任务自动重试机制

**功能描述**：失败的任务会自动重试，最多重试3次。

**实现位置**：
- `models/Video.js` - 重试计数和检查方法
- `jobs/cronJobs.js` - 重试定时任务

**关键特性**：
- 最大重试次数限制
- 重试间隔控制
- 重试历史记录

**配置**：
```env
MAX_RETRY_COUNT=3
RETRY_DELAY_HOURS=2
```

### 4. 下载链接防盗链 / 有效期签名

**功能描述**：生成带有签名和有效期的安全下载链接。

**实现位置**：
- `services/signedUrlService.js` - 签名URL服务
- `models/Video.js` - 签名URL字段

**关键特性**：
- JWT签名验证
- 可配置有效期
- 防盗链保护
- 支持批量下载

**使用示例**：
```javascript
// 生成签名URL
const signedUrl = signedUrlService.generateSignedUrl(videoId, userId, {
  expiryTime: Date.now() + 24 * 60 * 60 * 1000 // 24小时
});

// 验证签名URL
const verification = signedUrlService.verifySignedUrl(token, videoId, userId);
```

### 5. 多语言支持（i18n）

**功能描述**：支持中文、英文、日文、韩文的多语言界面。

**实现位置**：
- `services/i18nService.js` - 国际化服务
- `middleware/auth.js` - 语言检测中间件

**支持语言**：
- 中文简体 (zh-CN)
- 英文 (en-US)
- 日文 (ja-JP)
- 韩文 (ko-KR)

**使用示例**：
```javascript
// 获取本地化消息
const message = i18nService.getMessage('video.generation_completed', 'zh-CN');

// 中间件自动检测语言
app.use(i18nService.middleware());
```

### 6. 通知服务（Webhook / 邮件）

**功能描述**：支持邮件和Webhook通知，用户可以及时了解视频生成状态。

**实现位置**：
- `services/notificationService.js` - 通知服务

**通知类型**：
- 视频生成完成
- 视频生成失败
- 订阅即将到期
- 账户受限

**配置**：
```env
# 邮件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Webhook配置
WEBHOOK_SECRET=your_webhook_secret
```

### 7. 内容合规与违规检测

**功能描述**：集成OpenAI Moderation API和Azure Content Safety，检测不当内容。

**实现位置**：
- `services/moderationService.js` - 内容审核服务

**支持的审核服务**：
- OpenAI Moderation API
- Azure Content Safety
- 自定义审核规则

**配置**：
```env
OPENAI_API_KEY=your_openai_key
AZURE_CONTENT_SAFETY_KEY=your_azure_key
AZURE_CONTENT_SAFETY_ENDPOINT=your_azure_endpoint
```

### 8. 管理后台 API

**功能描述**：完整的管理后台功能，支持用户管理、视频管理、内容审核等。

**实现位置**：
- `routes/admin.js` - 管理后台路由

**主要功能**：
- 系统概览统计
- 用户管理（查看、封禁、调整积分）
- 视频管理（查看、删除、批量操作）
- 内容审核（审核决定、统计）
- 系统配置管理

**访问权限**：
```env
ADMIN_TOKEN=your_admin_token
ADMIN_EMAILS=admin@example.com
```

### 9. 积分消费限频 / 并发控制

**功能描述**：根据用户订阅等级限制生成频率和并发任务数。

**实现位置**：
- `models/User.js` - 限频和并发控制方法

**限制规则**：
- 免费用户：3分钟间隔，1个并发任务
- Plus用户：1分钟间隔，3个并发任务
- Pro用户：30秒间隔，5个并发任务
- Flagship用户：无间隔限制，10个并发任务

**配置**：
```env
MAX_CONCURRENT_TASKS_FREE=1
MAX_CONCURRENT_TASKS_PLUS=3
MAX_CONCURRENT_TASKS_PRO=5
MAX_CONCURRENT_TASKS_FLAGSHIP=10
```

### 10. 用户设备与IP记录

**功能描述**：记录用户登录的设备信息和IP地址，用于风险控制。

**实现位置**：
- `models/User.js` - 登录历史和风险评分
- `middleware/auth.js` - 设备指纹和IP记录

**记录信息**：
- IP地址和地理位置
- 设备指纹
- User-Agent
- 登录时间
- 风险评分

## 🔧 安装和配置

### 1. 安装新依赖

```bash
npm install nodemailer aws-sdk jsonwebtoken
```

### 2. 环境变量配置

复制并配置环境变量：

```bash
cp config.env.example config.env
```

关键配置项：
```env
# 签名URL密钥
SIGNED_URL_SECRET=your_signed_url_secret

# 管理员配置
ADMIN_TOKEN=your_admin_token
ADMIN_EMAILS=admin@example.com

# 邮件服务
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# 内容审核
OPENAI_API_KEY=your_openai_key
AZURE_CONTENT_SAFETY_KEY=your_azure_key

# 功能开关
ENABLE_CONTENT_MODERATION=true
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_WEBHOOK_NOTIFICATIONS=true
```

### 3. 启动服务

```bash
npm start
```

## 📊 监控和维护

### 定时任务

系统会自动运行以下定时任务：

- **每10分钟**：检查超时任务
- **每小时**：清理过期签名URL
- **每天凌晨2点**：检查重试任务
- **每天凌晨3点**：发送订阅提醒
- **每天凌晨4点**：清理并发任务计数
- **每天凌晨5点**：更新风险评分

### 健康检查

访问 `/health` 端点查看系统状态：

```bash
curl http://localhost:3000/health
```

### 管理后台

访问管理后台查看系统统计：

```bash
curl -H "Authorization: Bearer your_admin_token" \
     http://localhost:3000/api/admin/dashboard
```

## 🔒 安全注意事项

1. **管理员令牌**：使用强密码作为管理员令牌
2. **签名密钥**：定期更换签名URL密钥
3. **邮件配置**：使用应用专用密码，不要使用账户密码
4. **数据库访问**：限制数据库访问权限
5. **日志监控**：定期检查错误日志和异常行为

## 🐛 故障排除

### 常见问题

1. **邮件发送失败**
   - 检查SMTP配置
   - 确认邮箱应用密码正确
   - 检查防火墙设置

2. **内容审核不工作**
   - 验证API密钥
   - 检查网络连接
   - 查看错误日志

3. **定时任务不执行**
   - 确认NODE_ENV不是'test'
   - 检查服务器时区设置
   - 查看cron任务日志

4. **签名URL验证失败**
   - 检查系统时间同步
   - 验证签名密钥一致性
   - 确认URL格式正确

## 📈 性能优化建议

1. **数据库索引**：确保已创建必要的数据库索引
2. **缓存策略**：考虑使用Redis缓存热点数据
3. **文件存储**：使用CDN加速文件访问
4. **监控告警**：设置系统监控和告警机制
5. **负载均衡**：高并发场景下使用负载均衡

## 📝 更新日志

### v2.0.0 (2024-12-19)

- ✅ 新增视频生成失败自动补偿功能
- ✅ 新增任务超时检测机制
- ✅ 新增失败任务自动重试机制
- ✅ 新增下载链接防盗链保护
- ✅ 新增多语言支持
- ✅ 新增通知服务（邮件/Webhook）
- ✅ 新增内容合规检测
- ✅ 新增管理后台API
- ✅ 新增积分消费限频控制
- ✅ 新增用户设备IP记录

这些功能大大提升了系统的稳定性、安全性和用户体验，为商业化运营提供了坚实的基础。 