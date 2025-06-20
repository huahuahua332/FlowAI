# Sealos 后端更新指南

本指南介绍如何将本地代码更新同步到已部署在 Sealos 上的后端服务。

## 🔄 更新方法

### 方法1：自动更新脚本（推荐）

使用提供的自动更新脚本：

```bash
# 赋予执行权限
chmod +x update-sealos.sh

# 执行更新
./update-sealos.sh
```

脚本会自动：
1. 提交当前代码更改
2. 推送到Git仓库
3. 提供后续操作指引

### 方法2：手动更新步骤

#### 步骤1：提交代码更改

```bash
# 查看修改的文件
git status

# 添加所有更改
git add .

# 提交更改
git commit -m "Update backend features"

# 推送到远程仓库
git push origin master
```

#### 步骤2：在Sealos控制台更新

1. **登录Sealos控制台**
   - 访问您的Sealos平台
   - 进入应用管理页面

2. **找到您的后端应用**
   - 在应用列表中找到后端服务
   - 点击应用名称进入详情页

3. **触发重新部署**
   - 点击「更新」或「重新部署」按钮
   - 或者修改环境变量触发重启

#### 步骤3：验证更新

```bash
# 检查应用状态
curl https://your-app-url.sealos.run/api/health

# 查看应用日志
# 在Sealos控制台查看Pod日志
```

## 🛠️ 高级更新方法

### 方法3：使用Webhook自动部署

如果您配置了Git Webhook：

1. **在Git仓库设置Webhook**
   ```
   Payload URL: https://your-sealos-webhook-url
   Content type: application/json
   Events: Push events
   ```

2. **推送代码即可自动部署**
   ```bash
   git push origin master
   # Sealos会自动检测到更新并重新部署
   ```

### 方法4：使用环境变量触发重启

在Sealos控制台添加或修改环境变量：

```
DEPLOY_TIME=1703123456  # 当前时间戳
```

这会触发Pod重启，拉取最新代码。

## 📋 更新检查清单

更新前请确认：

- [ ] 代码已在本地测试通过
- [ ] 环境变量配置正确
- [ ] 数据库迁移已执行（如需要）
- [ ] 依赖包已更新到package.json
- [ ] 敏感信息未提交到Git

更新后请验证：

- [ ] 应用状态正常（Running）
- [ ] API接口响应正常
- [ ] 日志无错误信息
- [ ] 核心功能工作正常

## 🚨 故障排除

### 常见问题

1. **部署失败**
   - 检查代码语法错误
   - 查看Pod日志排查问题
   - 确认环境变量配置

2. **服务无法访问**
   - 检查端口配置
   - 确认网络策略设置
   - 验证域名解析

3. **数据库连接失败**
   - 检查MongoDB连接字符串
   - 确认数据库服务状态
   - 验证网络连通性

### 回滚操作

如果更新出现问题，可以快速回滚：

```bash
# 回滚到上一个提交
git reset --hard HEAD~1
git push origin master --force

# 在Sealos控制台重新部署
```

## 📊 监控更新状态

### 实时监控命令

```bash
# 监控应用状态
watch -n 5 'curl -s https://your-app-url.sealos.run/api/health | jq'

# 查看部署进度
# 在Sealos控制台实时查看Pod状态和日志
```

### 健康检查端点

确保您的应用包含健康检查端点：

```javascript
// 在server.js中添加
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});
```

## 🎯 最佳实践

1. **渐进式更新**
   - 先在测试环境验证
   - 分批次更新功能
   - 保持向后兼容

2. **版本管理**
   - 使用语义化版本号
   - 为重要更新打标签
   - 维护更新日志

3. **备份策略**
   - 更新前备份数据库
   - 保留上一版本的部署配置
   - 准备快速回滚方案

4. **监控告警**
   - 设置应用监控
   - 配置错误告警
   - 监控关键指标

---

💡 **提示**: 建议在低峰期进行更新，确保用户体验不受影响。 