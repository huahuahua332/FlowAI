#!/bin/bash

# AI视频生成后端部署脚本
echo "🚀 开始部署AI视频生成后端服务..."

# 检查Node.js版本
echo "📋 检查Node.js版本..."
node --version
npm --version

# 停止现有服务
echo "🛑 停止现有服务..."
pkill -f "node.*server.js" || echo "没有运行中的服务"

# 安装生产依赖
echo "📦 安装生产依赖..."
npm ci --only=production

# 数据库连接测试
echo "🔌 测试数据库连接..."
node -e "
const { connectDB } = require('./config/database');
connectDB().then(() => {
  console.log('✅ 数据库连接成功');
  process.exit(0);
}).catch(err => {
  console.error('❌ 数据库连接失败:', err.message);
  process.exit(1);
});
"

# 启动生产服务
echo "🌟 启动生产服务..."
nohup npm start > server.log 2>&1 &

# 等待服务启动
sleep 5

# 检查服务状态
echo "🔍 检查服务状态..."
if pgrep -f "node.*server.js" > /dev/null; then
    echo "✅ 服务启动成功"
    echo "📝 进程ID: $(pgrep -f 'node.*server.js')"
    echo "🌐 服务地址: http://localhost:3000"
    echo "📊 健康检查: http://localhost:3000/health"
    echo "🔧 管理后台: http://localhost:3000/admin.html"
else
    echo "❌ 服务启动失败"
    echo "📋 查看日志: tail -f server.log"
    exit 1
fi

# 健康检查
echo "🏥 执行健康检查..."
sleep 3
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ 健康检查通过 (HTTP $HTTP_STATUS)"
else
    echo "⚠️  健康检查异常 (HTTP $HTTP_STATUS)"
fi

echo "🎉 部署完成！"
echo ""
echo "📋 服务信息:"
echo "   - 端口: 3000"
echo "   - 环境: production"
echo "   - 日志: server.log"
echo "   - 进程: $(pgrep -f 'node.*server.js' || echo '未运行')"
echo ""
echo "🔧 管理命令:"
echo "   - 查看日志: tail -f server.log"
echo "   - 重启服务: ./restart.sh"
echo "   - 停止服务: pkill -f 'node.*server.js'"
echo "   - 查看状态: ps aux | grep server.js" 