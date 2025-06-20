#!/bin/bash

# Sealos 后端更新脚本
# 使用方法: ./update-sealos.sh

echo "🚀 开始更新 Sealos 部署的后端服务..."

# 1. 提交当前更改到Git
echo "📝 提交当前代码更改..."
git add .
git commit -m "Update backend with core features - $(date '+%Y-%m-%d %H:%M:%S')"

# 2. 推送到远程仓库
echo "⬆️ 推送代码到远程仓库..."
git push origin master

# 3. 触发Sealos重新部署
echo "🔄 触发 Sealos 重新部署..."

# 方法1: 如果配置了Webhook，可以触发重新部署
# curl -X POST "YOUR_SEALOS_WEBHOOK_URL"

# 方法2: 通过修改环境变量触发重启
echo "📅 更新部署时间戳..."
TIMESTAMP=$(date +%s)

echo "✅ 代码已推送到仓库"
echo "📋 接下来请在 Sealos 控制台执行以下操作："
echo ""
echo "1. 进入您的应用管理页面"
echo "2. 点击应用名称进入详情"
echo "3. 点击「更新」或「重新部署」按钮"
echo "4. 或者添加环境变量 DEPLOY_TIME=$TIMESTAMP 触发重启"
echo ""
echo "🎉 更新完成！请检查 Sealos 控制台确认部署状态" 