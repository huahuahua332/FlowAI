# Sealos 部署与更新指南

本指南将帮助您在Sealos平台上部署和更新AI视频生成后端服务。

## 🚀 当前部署信息

- **部署域名**: `https://lbszbktvnuvn.sealoshzh.site`
- **数据库**: `mongodb://root:q2lr8xrk@dbconn.sealoshzh.site:44370`
- **平台**: Sealos Cloud
- **环境**: 生产环境

## 📋 更新部署的方法

### 方法一：通过 Sealos 控制台更新（推荐）

#### 1. 登录 Sealos 控制台
```bash
# 访问 Sealos 控制台
https://cloud.sealos.io/
```

#### 2. 进入应用管理
- 点击 "应用管理" (App Launchpad)
- 找到您的视频生成应用
- 点击应用名称进入详情页

#### 3. 更新代码
- 点击 "更新" 或 "重新部署" 按钮
- 如果使用 Git 部署，确保代码已推送到仓库
- 如果使用镜像部署，需要重新构建镜像

#### 4. 重启服务
- 在应用详情页点击 "重启"
- 等待服务重新启动完成

### 方法二：通过 Git 自动部署

#### 1. 设置 Git 仓库
如果还没有设置，请先将代码推送到 Git 仓库：

```bash
# 初始化 Git 仓库（如果还没有）
git init
git add .
git commit -m "初始提交：AI视频生成后端"

# 添加远程仓库
git remote add origin <your-git-repo-url>
git push -u origin main
```

#### 2. 在 Sealos 中配置 Git 部署
- 在应用设置中选择 "Git 仓库"
- 输入仓库地址和分支
- 配置自动部署触发器

#### 3. 推送更新
```bash
# 提交本地更改
git add .
git commit -m "更新：添加10个核心功能"
git push origin main
```

### 方法三：通过 Docker 镜像更新

#### 1. 创建 Dockerfile
```dockerfile
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装生产依赖
RUN npm ci --only=production && npm cache clean --force

# 复制应用代码
COPY . .

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# 更改文件所有权
RUN chown -R nextjs:nodejs /app
USER nextjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# 启动应用
CMD ["npm", "start"]
```

#### 2. 构建并推送镜像
```bash
# 构建镜像
docker build -t your-registry/video-backend:latest .

# 推送到镜像仓库
docker push your-registry/video-backend:latest
```

#### 3. 在 Sealos 中更新镜像
- 在应用设置中更新镜像地址
- 点击重新部署

### 方法四：通过 Sealos CLI 更新

#### 1. 安装 Sealos CLI
```bash
# 下载并安装 Sealos CLI
curl -sfL https://raw.githubusercontent.com/labring/sealos/main/scripts/install.sh | sh -s v4.3.0
```

#### 2. 登录 Sealos
```bash
sealos login
```

#### 3. 部署更新
```bash
# 使用 kubectl 更新部署
kubectl set image deployment/video-backend video-backend=your-registry/video-backend:latest
```

## 🔧 环境配置更新

### 1. 更新环境变量
在 Sealos 控制台中更新以下环境变量：

```bash
# 核心配置
NODE_ENV=production
PORT=3000

# 数据库配置
MONGODB_URI=mongodb://root:q2lr8xrk@dbconn.sealoshzh.site:44370/video_generation

# 新增功能配置
SIGNED_URL_SECRET=your_jwt_secret_for_signed_urls
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_admin_password
ADMIN_EMAIL=admin@yourdomain.com

# 邮件服务配置（用于通知功能）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=AI视频生成服务 <noreply@yourdomain.com>

# Webhook 配置
WEBHOOK_SECRET=your_webhook_secret_key

# Azure 内容安全（用于内容审核）
AZURE_CONTENT_SAFETY_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_CONTENT_SAFETY_KEY=your_azure_key

# OSS 配置（阿里云示例）
OSS_PROVIDER=aliyun
ALIYUN_OSS_REGION=oss-cn-hangzhou
ALIYUN_OSS_BUCKET=your-bucket-name
ALIYUN_OSS_ACCESS_KEY_ID=your_access_key
ALIYUN_OSS_ACCESS_KEY_SECRET=your_secret_key

# 功能开关
ENABLE_CONTENT_MODERATION=true
ENABLE_NOTIFICATIONS=true
ENABLE_SIGNED_URLS=true
ENABLE_ADMIN_PANEL=true
ENABLE_RATE_LIMITING=true

# 限制配置
MAX_CONCURRENT_TASKS_FREE=1
MAX_CONCURRENT_TASKS_PLUS=2
MAX_CONCURRENT_TASKS_PRO=5
MAX_CONCURRENT_TASKS_FLAGSHIP=10

RATE_LIMIT_WINDOW_MINUTES=60
RATE_LIMIT_MAX_REQUESTS_FREE=5
RATE_LIMIT_MAX_REQUESTS_PLUS=50
RATE_LIMIT_MAX_REQUESTS_PRO=200
RATE_LIMIT_MAX_REQUESTS_FLAGSHIP=500

# 重试和超时配置
MAX_RETRY_ATTEMPTS=3
VIDEO_TIMEOUT_MINUTES=10
SIGNED_URL_EXPIRY_HOURS=24
```

### 2. 配置持久化存储
确保 Sealos 中配置了持久化存储用于：
- 日志文件
- 临时文件
- 缓存数据

## 📁 部署文件配置

### 1. Sealos 应用配置文件 (sealos-app.yaml)
```yaml
apiVersion: app.sealos.io/v1
kind: App
metadata:
  name: video-generation-backend
  namespace: default
spec:
  data:
    url: https://lbszbktvnuvn.sealoshzh.site
  displayType: normal
  gitRepo: https://github.com/your-username/your-repo.git
  icon: https://your-icon-url.com/icon.png
  name: AI视频生成后端
  type: iframe
```

### 2. Kubernetes 部署配置 (k8s-deployment.yaml)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: video-backend
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: video-backend
  template:
    metadata:
      labels:
        app: video-backend
    spec:
      containers:
      - name: video-backend
        image: your-registry/video-backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: MONGODB_URI
          value: "mongodb://root:q2lr8xrk@dbconn.sealoshzh.site:44370/video_generation"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: video-backend-service
  namespace: default
spec:
  selector:
    app: video-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP
```

## 🔄 自动化部署脚本

### 1. 创建更新脚本 (update-sealos.sh)
```bash
#!/bin/bash

echo "🚀 开始更新 Sealos 部署..."

# 检查必要工具
command -v git >/dev/null 2>&1 || { echo "❌ Git 未安装"; exit 1; }

# 提交本地更改
echo "📝 提交本地更改..."
git add .
git commit -m "更新：$(date '+%Y-%m-%d %H:%M:%S')"

# 推送到远程仓库
echo "📤 推送到远程仓库..."
git push origin main

# 等待自动部署
echo "⏳ 等待自动部署完成..."
sleep 30

# 检查部署状态
echo "🔍 检查部署状态..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://lbszbktvnuvn.sealoshzh.site/health || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ 部署成功！服务正常运行"
    echo "🌐 访问地址: https://lbszbktvnuvn.sealoshzh.site"
    echo "🔧 管理后台: https://lbszbktvnuvn.sealoshzh.site/admin.html"
else
    echo "⚠️  部署可能有问题 (HTTP $HTTP_STATUS)"
    echo "请检查 Sealos 控制台日志"
fi

echo "🎉 更新完成！"
```

### 2. 赋予执行权限
```bash
chmod +x update-sealos.sh
```

### 3. 运行更新
```bash
./update-sealos.sh
```

## 📊 监控和日志

### 1. 查看应用日志
在 Sealos 控制台中：
- 进入应用详情页
- 点击 "日志" 标签
- 实时查看应用运行日志

### 2. 监控应用状态
- **健康检查**: `https://lbszbktvnuvn.sealoshzh.site/health`
- **管理后台**: `https://lbszbktvnuvn.sealoshzh.site/admin.html`
- **API 状态**: `https://lbszbktvnuvn.sealoshzh.site/api/status`

### 3. 设置告警
在 Sealos 控制台中配置：
- CPU/内存使用率告警
- 应用健康检查失败告警
- 错误日志告警

## 🔒 安全配置

### 1. 更新敏感信息
- 更改默认管理员密码
- 更新 JWT 密钥
- 配置 HTTPS 证书

### 2. 网络安全
- 配置防火墙规则
- 启用 DDoS 保护
- 设置访问限制

## 🚨 故障排除

### 1. 常见问题

#### 部署失败
```bash
# 检查应用日志
kubectl logs deployment/video-backend

# 检查资源使用
kubectl top pods

# 检查配置
kubectl describe deployment video-backend
```

#### 数据库连接失败
- 检查数据库连接字符串
- 验证网络连通性
- 确认数据库服务状态

#### 环境变量问题
- 在 Sealos 控制台检查环境变量配置
- 重启应用使配置生效

### 2. 回滚部署
```bash
# 查看部署历史
kubectl rollout history deployment/video-backend

# 回滚到上一个版本
kubectl rollout undo deployment/video-backend

# 回滚到指定版本
kubectl rollout undo deployment/video-backend --to-revision=2
```

## 📈 性能优化

### 1. 资源配置优化
- 根据使用情况调整 CPU/内存限制
- 配置水平自动扩缩容 (HPA)
- 优化镜像大小

### 2. 缓存配置
- 启用 Redis 缓存
- 配置 CDN 加速
- 优化数据库查询

## 🎯 下次更新流程

1. **本地开发完成**：确保所有功能在本地测试通过
2. **提交代码**：使用 `git commit` 提交更改
3. **推送代码**：使用 `git push` 推送到远程仓库
4. **触发部署**：Sealos 自动检测到代码更改并重新部署
5. **验证部署**：检查健康检查端点和功能是否正常
6. **监控运行**：观察应用运行状态和性能指标

---

通过以上指南，您可以轻松地在 Sealos 平台上更新和维护您的AI视频生成后端服务。如有问题，请查看 Sealos 官方文档或联系技术支持。 