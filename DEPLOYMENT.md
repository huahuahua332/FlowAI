# AI视频生成后端部署指南

本指南将帮助您部署集成了 Google Veo-3、WAN I2V 和 WAN T2V 模型的视频生成后端服务。

## 🚀 快速开始

### 1. 环境准备

确保您的系统满足以下要求：
- Node.js 18+
- MongoDB 5.0+
- 至少 1GB 内存
- 稳定的网络连接

### 2. 获取 Replicate API Token

1. 访问 [Replicate.com](https://replicate.com)
2. 注册并登录账户
3. 进入 Account Settings > API Tokens
4. 创建新的 API Token
5. 复制并保存 Token（格式：`r8_...`）

### 3. 配置环境变量

复制 `config.env` 文件并配置以下关键变量：

```bash
# 必需配置
REPLICATE_API_TOKEN=r8_your_actual_token_here

# 数据库配置
MONGODB_URI=mongodb://localhost:27017/video_generation
DB_NAME=video_generation

# 其他必需配置
JWT_SECRET=your_jwt_secret_key
SESSION_SECRET=your_session_secret_key
```

### 4. 安装依赖并启动

```bash
# 安装依赖
npm install

# 启动服务
npm run dev
```

## 🎯 模型集成详情

### Google Veo-3
- **模型ID**: `google/veo-3`
- **功能**: 高质量文本转视频
- **支持时长**: 5-10秒
- **输入**: 文本提示词
- **输出**: 高清视频文件

### WAN I2V (Image-to-Video)
- **模型ID**: `wavespeedai/wan-2.1-i2v-480p`
- **功能**: 图片转视频
- **支持时长**: 5-10秒
- **输入**: 图片URL + 可选文本提示
- **输出**: 480p视频文件

### WAN T2V (Text-to-Video)
- **模型ID**: `wavespeedai/wan-2.1-t2v-720p`
- **功能**: 文本转视频
- **支持时长**: 5-10秒
- **输入**: 文本提示词
- **输出**: 720p视频文件

## 📡 API 端点

### 1. Google Veo-3 生成
```http
POST /api/generate/veo-3
Authorization: Bearer <token>
Content-Type: application/json

{
  "prompt": "A beautiful sunset over the ocean",
  "duration": 5,
  "aspectRatio": "16:9"
}
```

### 2. WAN I2V 生成
```http
POST /api/generate/wan-i2v
Authorization: Bearer <token>
Content-Type: application/json

{
  "image": "https://example.com/image.jpg",
  "prompt": "A woman is talking",
  "duration": 5
}
```

### 3. WAN T2V 生成
```http
POST /api/generate/wan-t2v
Authorization: Bearer <token>
Content-Type: application/json

{
  "prompt": "A cat playing with a ball",
  "duration": 5
}
```

## 🧪 测试部署

运行测试脚本验证模型集成：

```bash
node test/testReplicate.js
```

预期输出：
```
开始测试 Replicate 服务...

✅ 环境变量配置正确
🔑 API Token: r8_abcd...

🧪 测试 WAN T2V 模型...
✅ WAN T2V 测试成功
📹 视频URL: https://replicate.delivery/...

🧪 测试 Veo-3 模型...
✅ Veo-3 测试成功
📹 视频URL: https://replicate.delivery/...

📊 测试完成！
```

## 💰 成本估算

### Replicate 定价（参考）
- **Google Veo-3**: ~$0.30-0.50 per 5秒视频
- **WAN I2V**: ~$0.15-0.25 per 4秒视频
- **WAN T2V**: ~$0.20-0.30 per 4秒视频

### 积分系统配置
- **Veo-3**: 70积分（5秒）/ 140积分（10秒）
- **WAN I2V**: 22积分（5秒）/ 32积分（10秒）
- **WAN T2V**: 45积分（5秒）/ 65积分（10秒）

## 🔧 生产环境部署

### Docker 部署

1. 构建镜像：
```bash
docker build -t video-generation-backend .
```

2. 运行容器：
```bash
docker run -d \
  --name video-backend \
  -p 3000:3000 \
  -e REPLICATE_API_TOKEN=your_token \
  -e MONGODB_URI=your_mongodb_uri \
  video-generation-backend
```

### 环境变量检查清单

- [ ] `REPLICATE_API_TOKEN` - Replicate API 密钥
- [ ] `MONGODB_URI` - MongoDB 连接字符串
- [ ] `JWT_SECRET` - JWT 签名密钥
- [ ] `SESSION_SECRET` - 会话密钥
- [ ] `FRONTEND_URL` - 前端应用URL
- [ ] `OSS_*` - 对象存储配置（用于视频存储）

## 🚨 常见问题

### 1. Replicate API 调用失败
- 检查 API Token 是否正确
- 确认账户余额充足
- 验证模型ID是否正确

### 2. 视频生成超时
- Replicate 模型通常需要 2-5 分钟
- 检查网络连接稳定性
- 考虑增加超时时间

### 3. 积分扣除异常
- 检查数据库连接
- 验证用户积分余额
- 查看错误日志

## 📊 监控和日志

### 关键指标监控
- API 调用成功率
- 视频生成完成率
- 平均生成时间
- 用户积分消耗

### 日志文件位置
- 应用日志: `logs/app.log`
- 错误日志: `logs/error.log`
- Replicate 调用日志: `logs/replicate.log`

## 🔄 更新和维护

### 定期任务
1. 监控 Replicate 模型版本更新
2. 检查 API 调用配额使用情况
3. 清理过期的临时视频文件
4. 备份用户数据和配置

### 扩展建议
- 考虑添加视频预处理功能
- 实现视频质量优化
- 添加更多 AI 模型支持
- 实现批量生成功能

## 📞 技术支持

如果在部署过程中遇到问题，请：
1. 检查日志文件
2. 运行测试脚本
3. 查看 Replicate 官方文档
4. 联系技术支持团队

---

**注意**: 请确保在生产环境中使用 HTTPS，并妥善保管所有 API 密钥和敏感信息。 