# 🚀 Sealos 快速部署指南

## 一键更新部署

### 方法1：使用自动化脚本（推荐）

```bash
# 运行自动化更新脚本
./update-sealos.sh
```

这个脚本会自动：
- ✅ 检查环境和依赖
- ✅ 提交本地代码更改
- ✅ 推送到远程仓库
- ✅ 等待 Sealos 自动部署
- ✅ 验证部署状态
- ✅ 显示部署结果

### 方法2：手动 Git 部署

```bash
# 1. 提交更改
git add .
git commit -m "更新：添加10个核心功能"

# 2. 推送代码
git push origin main

# 3. 等待自动部署（约1-2分钟）

# 4. 验证部署
curl https://lbszbktvnuvn.sealoshzh.site/health
```

## 🎯 当前部署信息

- **主域名**: https://lbszbktvnuvn.sealoshzh.site
- **管理后台**: https://lbszbktvnuvn.sealoshzh.site/admin.html
- **健康检查**: https://lbszbktvnuvn.sealoshzh.site/health
- **数据库**: mongodb://root:q2lr8xrk@dbconn.sealoshzh.site:44370

## 🔧 环境变量配置

在 Sealos 控制台中需要配置的新环境变量：

```bash
# 管理员配置
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
ADMIN_EMAIL=admin@yourdomain.com

# 签名URL密钥
SIGNED_URL_SECRET=your_jwt_secret_key

# 邮件服务（可选）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# 功能开关
ENABLE_CONTENT_MODERATION=true
ENABLE_NOTIFICATIONS=true
ENABLE_SIGNED_URLS=true
ENABLE_ADMIN_PANEL=true
```

## 📱 快速验证

部署完成后，访问以下链接验证功能：

1. **健康检查**: https://lbszbktvnuvn.sealoshzh.site/health
2. **API状态**: https://lbszbktvnuvn.sealoshzh.site/api/status
3. **管理后台**: https://lbszbktvnuvn.sealoshzh.site/admin.html

## 🆘 快速故障排除

### 部署失败
```bash
# 检查 Git 状态
git status

# 查看最近的提交
git log --oneline -5

# 强制重新部署
git commit --allow-empty -m "强制重新部署"
git push origin main
```

### 服务无响应
1. 登录 [Sealos 控制台](https://cloud.sealos.io/)
2. 进入 "应用管理"
3. 找到您的应用，点击 "重启"
4. 查看 "日志" 标签页了解错误信息

### 环境变量问题
1. 在 Sealos 控制台检查环境变量配置
2. 确保所有必需的环境变量都已设置
3. 重启应用使配置生效

## 🎉 新功能验证

部署成功后，您的系统将拥有以下新功能：

- ✅ **自动补偿**: 视频生成失败时自动退还积分
- ✅ **超时保护**: 自动检测并处理超时任务
- ✅ **智能重试**: 失败任务自动重试机制
- ✅ **安全下载**: 防盗链签名URL
- ✅ **多语言**: 支持中英日韩四种语言
- ✅ **实时通知**: 邮件和Webhook通知
- ✅ **内容审核**: 自动检测违规内容
- ✅ **管理后台**: 完整的运营管理界面
- ✅ **频率控制**: 防止滥用的限频机制
- ✅ **风控记录**: 用户行为和设备记录

## 📞 需要帮助？

- 🌐 **Sealos 控制台**: https://cloud.sealos.io/
- 📊 **应用监控**: 控制台 → 应用管理 → 选择应用 → 监控
- 📋 **查看日志**: 控制台 → 应用管理 → 选择应用 → 日志
- 🔄 **重启应用**: 控制台 → 应用管理 → 选择应用 → 重启 