# 支付系统 API 文档

## 概述

本文档描述了视频生成平台的 Creem 支付系统集成 API。系统支持订阅管理和积分充值两种支付模式。

## 基础信息

- **基础URL**: `https://lbszbktvnuvn.sealoshzh.site/api/payment`
- **认证方式**: Bearer Token (JWT)
- **支付处理商**: Creem
- **支持货币**: USD

## 订阅计划

### 订阅等级

| 等级 | 月费 | 年费 | 积分奖励 | 特性 |
|------|------|------|----------|------|
| 免费版 | $0 | - | 30 | 每月3次生成，480P，基础模型 |
| Plus版 | $12.99 | $9.99 | 120/1440 | 无限生成，720P，双模型 |
| Pro版 | $36.99 | $29.99 | 380/4560 | 批量生成4个，5-10秒视频 |
| 旗舰版 | $99.99 | $69.99 | 1000/12000 | 全模型，1080P，优先处理 |

### 积分充值包

| 积分数量 | 价格 | 赠送积分 | 总积分 |
|----------|------|----------|--------|
| 100 | $9.99 | 10 | 110 |
| 250 | $22.99 | 25 | 275 |
| 500 | $44.99 | 50 | 550 |
| 1000 | $79.99 | 0 | 1000 |

## API 端点

### 1. 获取订阅计划

```http
GET /api/payment/plans
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "free",
        "name": "免费版",
        "price": {
          "monthly": { "amount": 0, "currency": "USD" }
        },
        "features": [
          "每月生成 3 次",
          "支持 5 秒视频",
          "480P 标准画质"
        ],
        "limits": {
          "monthlyGenerations": 3,
          "maxDuration": 5,
          "allowedModels": ["wan-i2v"],
          "maxResolution": "480p",
          "batchSize": 1,
          "monthlyPoints": 30
        }
      }
    ]
  }
}
```

### 2. 获取积分充值包

```http
GET /api/payment/points-packages
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "packages": [
      {
        "id": "points_100",
        "points": 100,
        "price": { "amount": 9.99, "currency": "USD" },
        "bonus": 10,
        "popular": false,
        "description": "基础积分包"
      }
    ]
  }
}
```

### 3. 创建订阅支付

```http
POST /api/payment/create-subscription
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体:**
```json
{
  "plan_id": "prod_5oENOhXvTZ57S68mz48pHj"
}
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "checkout_url": "https://checkout.creem.com/session_xyz",
    "session_id": "cs_xyz123",
    "expires_at": "2024-01-01T12:00:00Z",
    "plan_details": {
      "level": "plus",
      "duration": "monthly",
      "points": 120,
      "price": 12.99
    }
  }
}
```

### 4. 创建积分充值支付

```http
POST /api/payment/create-points-payment
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体:**
```json
{
  "plan_id": "prod_5crVdSzFaypTX6vnIOqZL3"
}
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "checkout_url": "https://checkout.creem.com/session_abc",
    "session_id": "cs_abc456",
    "expires_at": "2024-01-01T12:00:00Z",
    "plan_details": {
      "type": "points",
      "points": 110,
      "price": 9.99
    }
  }
}
```

### 5. 获取支付会话状态

```http
GET /api/payment/session/:sessionId
Authorization: Bearer <token>
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "id": "cs_xyz123",
    "status": "complete",
    "payment_status": "paid",
    "customer_email": "user@example.com"
  }
}
```

### 6. 获取订阅状态

```http
GET /api/payment/subscription-status
Authorization: Bearer <token>
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "current_plan": "plus",
    "expiry_date": "2024-02-01T00:00:00Z",
    "subscription_id": "sub_xyz123",
    "subscription_details": {
      "status": "active",
      "current_period_end": 1706745600
    },
    "points": 150,
    "monthly_generations": 25
  }
}
```

### 7. 取消订阅

```http
POST /api/payment/cancel-subscription
Authorization: Bearer <token>
```

**响应示例:**
```json
{
  "success": true,
  "message": "订阅已取消，将在当前周期结束时生效"
}
```

### 8. 获取支付历史

```http
GET /api/payment/history?page=1&limit=10
Authorization: Bearer <token>
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "payments": [],
    "total": 0,
    "page": 1,
    "limit": 10
  }
}
```

## Webhook 端点

### 支付 Webhook

```http
POST /api/payment/webhook
Content-Type: application/json
X-Creem-Signature: sha256=<signature>
```

支持的事件类型:
- `checkout.session.completed` - 支付会话完成
- `customer.subscription.created` - 订阅创建
- `customer.subscription.updated` - 订阅更新
- `customer.subscription.deleted` - 订阅取消
- `invoice.payment_succeeded` - 发票支付成功

## 计划 ID 映射

### 订阅计划 ID

```javascript
// Plus 版
CREEM_PLAN_PLUS_MONTHLY = "prod_5oENOhXvTZ57S68mz48pHj"
CREEM_PLAN_PLUS_YEARLY = "prod_3XyMq9HBrrPmCrXwpRCKLy"

// Pro 版
CREEM_PLAN_PRO_MONTHLY = "prod_3mizlp40Lysjh1Z4w0SDRK"
CREEM_PLAN_PRO_YEARLY = "prod_1BWivRIF8lhIt14cTWAAFq"

// 旗舰版
CREEM_PLAN_FLAGSHIP_MONTHLY = "prod_4SEvDTteBLeV435uL1C1Yx"
CREEM_PLAN_FLAGSHIP_YEARLY = "prod_SXu8zIPQqU2bWYIij9uSo"
```

### 积分充值计划 ID

```javascript
CREEM_POINTS_100 = "prod_5crVdSzFaypTX6vnIOqZL3"
CREEM_POINTS_250 = "prod_npArLmyY8e7f3oeYSjN24"
CREEM_POINTS_500 = "prod_63gPLhh9ACl58PGp4qyWnr"
CREEM_POINTS_1000 = "prod_60cOBGjJZ28kgwyAzulMuu"
```

## 错误处理

### 常见错误代码

| 状态码 | 错误类型 | 描述 |
|--------|----------|------|
| 400 | Bad Request | 请求参数无效 |
| 401 | Unauthorized | 未授权或令牌无效 |
| 404 | Not Found | 资源不存在 |
| 500 | Internal Server Error | 服务器内部错误 |

### 错误响应格式

```json
{
  "success": false,
  "message": "错误描述信息"
}
```

## 前端集成示例

### 创建订阅支付

```javascript
async function createSubscription(planId) {
  try {
    const response = await fetch('/api/payment/create-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ plan_id: planId })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // 重定向到支付页面
      window.location.href = result.data.checkout_url;
    } else {
      console.error('创建支付失败:', result.message);
    }
  } catch (error) {
    console.error('请求错误:', error);
  }
}
```

### 检查支付状态

```javascript
async function checkPaymentStatus(sessionId) {
  try {
    const response = await fetch(`/api/payment/session/${sessionId}`, {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    
    const result = await response.json();
    
    if (result.success && result.data.status === 'complete') {
      // 支付成功，刷新用户信息
      await refreshUserInfo();
    }
  } catch (error) {
    console.error('检查支付状态错误:', error);
  }
}
```

## 测试

### 运行集成测试

```bash
node testCreemIntegration.js
```

### Webhook 测试

在 Creem 控制台配置 Webhook URL:
```
https://lbszbktvnuvn.sealoshzh.site/api/payment/webhook
```

### 支付流程测试

1. 调用创建支付 API 获取支付链接
2. 访问支付链接完成支付
3. 验证 Webhook 事件处理
4. 检查用户订阅状态更新

## 安全注意事项

1. **Webhook 签名验证**: 所有 Webhook 请求都会验证签名
2. **HTTPS**: 所有支付相关请求必须使用 HTTPS
3. **令牌验证**: API 需要有效的用户认证令牌
4. **环境变量**: 敏感信息存储在环境变量中

## 支持与维护

- **API 版本**: v1.0
- **更新日期**: 2024-01-01
- **联系方式**: 技术支持团队 