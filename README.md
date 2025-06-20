# 视频生成后端服务

基于 Node.js + Express + MongoDB + Mongoose 构建的视频生成后端服务，集成 Google OAuth 登录、Creem 支付系统，以及多种AI视频生成模型：Google Veo-3、WAN I2V 和 WAN T2V。

## 功能特性

### 🔐 用户系统
- Google OAuth 登录集成
- JWT 令牌认证
- 用户资料管理
- 订阅等级管理

### 💳 支付系统
- **Creem 支付集成**: 完整的支付流程和订阅管理
- **订阅管理**: 免费版、Plus版、Pro版、旗舰版四个等级
- **积分充值**: 100/250/500/1000积分充值包，含赠送积分
- **Webhook 处理**: 实时同步支付状态和订阅变更
- **安全验证**: 完整的签名验证和HTTPS加密

### 🎬 视频生成

- **Google Veo-3**: 高质量文本转视频（付费用户专享）
- **WAN I2V**: 图片转视频生成（付费用户专享）
- **WAN T2V**: 文本转720p视频（付费用户专享）
- 支持图片输入、参考图片、风格设置
- 自动生成英文标题和封面

### 🎯 积分与限制
- 基于订阅等级的使用限制
- 智能积分扣除系统
- 每日生成次数限制
- 失败自动退款

### ✅ 每日签到
- 每日签到奖励积分
- 连续签到7天额外奖励
- 签到状态跟踪

### 🔥 热门推荐
- 自动统计热门提示词
- 定时任务更新排行榜
- 提示词搜索和分类

### 🤖 AI 增强
- GPT-4 Turbo 自动生成标题
- 提示词优化建议
- 内容安全检查

## 技术栈

- **后端框架**: Node.js + Express
- **数据库**: MongoDB + Mongoose
- **认证**: Passport.js + Google OAuth 2.0
- **支付**: Creem Payment API
- **AI 服务**: OpenAI GPT-4 Turbo
- **存储**: 阿里云 OSS
- **定时任务**: node-cron
- **安全**: Helmet + CORS + Rate Limiting

## 项目结构

```
├── config/
│   └── database.js          # 数据库连接配置
├── models/
│   ├── User.js             # 用户模型
│   ├── Video.js            # 视频模型
│   ├── HotPrompt.js        # 热门提示词模型
│   └── Config.js           # 配置模型
├── middleware/
│   ├── auth.js             # 认证中间件
│   └── checkPoints.js      # 积分检查中间件
├── services/
│   ├── videoService.js     # 视频生成服务
│   ├── ossService.js       # OSS 存储服务
│   └── openaiService.js    # OpenAI 服务
├── routes/
│   ├── auth.js             # 认证路由
│   ├── generate.js         # 视频生成路由
│   ├── user.js             # 用户路由
│   ├── payment.js          # 支付路由
│   └── prompt.js           # 提示词路由
├── jobs/
│   └── cronJobs.js         # 定时任务
├── server.js               # 主服务器文件
├── package.json            # 项目依赖
└── config.env              # 环境变量配置
```

## 安装和运行

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `config.env` 文件并填入实际的配置信息：

```bash
# 数据库配置
MONGODB_URI=mongodb://root:q2lr8xrk@test-db-mongodb.ns-6i6eq5c2.svc:27017
DB_NAME=video_generation

# JWT 密钥
JWT_SECRET=your_jwt_secret_key_here

# Google OAuth 配置
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Creem 支付配置
CREEM_API_URL=https://api.creem.io
CREEM_API_KEY=creem_7ArQsO9ktfhrJetYpkngP3
CREEM_WEBHOOK_SECRET=whsec_3xPge4daBeqwUY3sbUgjWv
CREEM_ENVIRONMENT=production

# 订阅计划 ID
CREEM_PLAN_PLUS_MONTHLY=prod_5oENOhXvTZ57S68mz48pHj
CREEM_PLAN_PLUS_YEARLY=prod_3XyMq9HBrrPmCrXwpRCKLy
CREEM_PLAN_PRO_MONTHLY=prod_3mizlp40Lysjh1Z4w0SDRK
CREEM_PLAN_PRO_YEARLY=prod_1BWivRIF8lhIt14cTWAAFq
CREEM_PLAN_FLAGSHIP_MONTHLY=prod_4SEvDTteBLeV435uL1C1Yx
CREEM_PLAN_FLAGSHIP_YEARLY=prod_SXu8zIPQqU2bWYIij9uSo

# 积分充值计划 ID
CREEM_POINTS_100=prod_5crVdSzFaypTX6vnIOqZL3
CREEM_POINTS_250=prod_npArLmyY8e7f3oeYSjN24
CREEM_POINTS_500=prod_63gPLhh9ACl58PGp4qyWnr
CREEM_POINTS_1000=prod_60cOBGjJZ28kgwyAzulMuu

# Webhook 配置
WEBHOOK_CALLBACK_URL=https://lbszbktvnuvn.sealoshzh.site/api/payment/webhook
FRONTEND_URL=https://lbszbktvnuvn.sealoshzh.site

# OpenAI 配置
OPENAI_API_KEY=your_openai_api_key

# 阿里云 OSS 配置
OSS_REGION=your_oss_region
OSS_ACCESS_KEY_ID=your_oss_access_key_id
OSS_ACCESS_KEY_SECRET=your_oss_access_key_secret
OSS_BUCKET=your_oss_bucket



# Replicate API 配置
REPLICATE_API_TOKEN=your_replicate_api_token

# AI 模型配置
VEO_3_MODEL=google/veo-3
WAN_I2V_MODEL=wavespeedai/wan-2.1-i2v-480p
WAN_T2V_MODEL=wavespeedai/wan-2.1-t2v-720p

# 服务器配置
PORT=3000
NODE_ENV=development
```

### 3. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

## API 接口文档

### 认证接口

#### Google OAuth 登录
```
GET /auth/google
```

#### 获取用户信息
```
GET /auth/me
Authorization: Bearer <token>
```

### 视频生成接口



#### Google Veo-3 视频生成
```
POST /api/generate/veo-3
Authorization: Bearer <token>
Content-Type: application/json

{
  "prompt": "A beautiful sunset over the ocean",
  "duration": 5,
  "aspectRatio": "16:9"
}
```

#### WAN I2V 图片转视频
```
POST /api/generate/wan-i2v
Authorization: Bearer <token>
Content-Type: application/json

{
  "image": "https://example.com/image.jpg",
  "prompt": "A woman is talking",
  "duration": 4
}
```

#### WAN T2V 文本转视频
```
POST /api/generate/wan-t2v
Authorization: Bearer <token>
Content-Type: application/json

{
  "prompt": "A beautiful sunset over the ocean",
  "duration": 4
}
```

#### 批量生成示例 (Pro/旗舰版)
```
POST /api/generate/wan-t2v
Authorization: Bearer <token>
Content-Type: application/json

{
  "prompt": "A cat playing with a ball",
  "duration": 5,
  "batchSize": 4,
  "resolution": "720p"
}
```

#### 获取生成状态
```
GET /api/generate/status/:videoId
Authorization: Bearer <token>
```

### 用户接口

#### 每日签到
```
POST /api/user/signin
Authorization: Bearer <token>
```

#### 获取用户统计
```
GET /api/user/stats
Authorization: Bearer <token>
```

### 支付接口

#### 获取订阅计划
```
GET /api/payment/plans
```

#### 创建支付链接
```
POST /api/payment/create-payment
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "subscription",
  "plan_id": "plus",
  "amount": 9.99,
  "currency": "USD"
}
```

### 提示词接口

#### 获取热门提示词
```
GET /api/prompt/hot?limit=5
```

#### 搜索提示词
```
GET /api/prompt/search?q=sunset&category=nature
```

## 订阅等级

| 等级 | 每月生成次数 | 最大时长 | 支持模型 | 批量生成 | 赠送积分 | 价格 |
|------|-------------|----------|----------|----------|----------|------|
| 免费版 | 3次 | 5秒 | WAN I2V (480p) | 1个 | 30积分 | 免费 |
| Plus版 | 无限 | 5秒 | WAN I2V + T2V (720p) | 1个 | 120积分 | $12.99/月 (年付$9.99/月) |
| Pro版 | 无限 | 5-10秒 | WAN I2V + T2V (720p) | 4个 | 380积分 | $36.99/月 (年付$29.99/月) |
| 旗舰版 | 无限 | 5-10秒 | 全模型 (1080p) | 4个 | 1000积分 | $99.99/月 (年付$69.99/月) |

## 积分消耗

| 生成类型 | 5秒视频 | 10秒视频 | 成本参考 |
|----------|---------|----------|----------|
| WAN I2V (480p) | 22积分 | 32积分 | 每秒$0.09 |
| WAN T2V (720p) | 45积分 | 65积分 | 每秒$0.24 |
| Google Veo-3 (1080p) | 70积分 | 140积分 | 每秒$0.75 |

## 积分充值包

| 积分包 | 价格 | 赠送积分 | 性价比 |
|--------|------|----------|--------|
| 100积分 | $9.99 | +10积分 | 基础包 |
| 250积分 | $22.99 | +25积分 | 进阶包 |
| 500积分 | $44.99 | +50积分 | 高级包 ⭐ |
| 1000积分 | $79.99 | 无赠送 | 超值包 |

## 签到系统

- **每日签到**: 2积分
- **连续7天**: 额外5积分奖励
- **月签25天**: 额外12积分奖励
- **每月重置**: 不可补签

## 定时任务

- **每天 0:00**: 更新热门提示词统计
- **每天 1:00**: 清理过期订阅
- **每小时**: 检查失败的视频生成任务

## 部署说明

### Docker 部署

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### 环境要求

- Node.js 18+
- MongoDB 5.0+
- 内存: 至少 512MB
- 存储: 至少 1GB

## 监控和日志

- 健康检查端点: `GET /health`
- 错误日志自动记录
- 请求速率限制
- 安全头部设置

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License

## 联系方式

## 支付系统详情

### 订阅等级对比

| 等级 | 月费 | 年费 | 生成次数 | 视频时长 | 画质 | 支持模型 | 批量生成 | 积分奖励 |
|------|------|------|----------|----------|------|----------|----------|----------|
| 免费版 | $0 | - | 3次/月 | 5秒 | 480P | WAN I2V | 1个 | 30 |
| Plus版 | $12.99 | $9.99 | 无限 | 5秒 | 720P | WAN I2V + T2V | 1个 | 120/1440 |
| Pro版 | $36.99 | $29.99 | 无限 | 5-10秒 | 720P | WAN I2V + T2V | 4个 | 380/4560 |
| 旗舰版 | $99.99 | $69.99 | 无限 | 5-10秒 | 1080P | 全模型 | 4个 | 1000/12000 |

### 积分消耗

| 模型 | 画质 | 5秒视频 | 10秒视频 |
|------|------|---------|----------|
| WAN I2V | 480p | 5积分 | 9积分 |
| WAN T2V | 720p | 12积分 | 24积分 |
| Google Veo-3 | 1080p | 38积分 | 75积分 |

### 支付API

完整的支付API文档请参考 [PAYMENT_API.md](./PAYMENT_API.md)

主要API端点：
- `POST /api/payment/create-subscription` - 创建订阅支付
- `POST /api/payment/create-points-payment` - 创建积分充值
- `GET /api/payment/subscription-status` - 获取订阅状态
- `POST /api/payment/cancel-subscription` - 取消订阅

### Webhook 配置

在 Creem 控制台配置以下 Webhook URL：
```
https://lbszbktvnuvn.sealoshzh.site/api/payment/webhook
```

---

如有问题或建议，请联系开发团队。 