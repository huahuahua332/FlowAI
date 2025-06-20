#!/bin/bash

echo "🔄 重启AI视频生成后端服务..."

# 停止现有服务
echo "🛑 停止现有服务..."
pkill -f "node.*server.js" || echo "没有运行中的服务"

# 等待进程完全停止
sleep 2

# 启动服务
echo "🌟 启动服务..."
nohup npm start > server.log 2>&1 &

# 等待服务启动
sleep 5

# 检查服务状态
if pgrep -f "node.*server.js" > /dev/null; then
    echo "✅ 服务重启成功"
    echo "📝 进程ID: $(pgrep -f 'node.*server.js')"
else
    echo "❌ 服务重启失败"
    echo "📋 查看日志: tail -f server.log"
    exit 1
fi

echo "🎉 重启完成！" 