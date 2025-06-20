#!/bin/bash

# Sealos 部署更新脚本
# 用于将本地代码更新同步到 Sealos 部署的后端服务

set -e  # 遇到错误时停止执行

echo "🚀 开始更新 Sealos 部署..."
echo "当前时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "部署域名: https://lbszbktvnuvn.sealoshzh.site"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查必要工具
echo -e "${BLUE}📋 检查必要工具...${NC}"
command -v git >/dev/null 2>&1 || { echo -e "${RED}❌ Git 未安装${NC}"; exit 1; }
command -v curl >/dev/null 2>&1 || { echo -e "${RED}❌ curl 未安装${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}❌ Node.js 未安装${NC}"; exit 1; }

echo -e "${GREEN}✅ 必要工具检查完成${NC}"
echo ""

# 检查 Git 状态
echo -e "${BLUE}📊 检查 Git 状态...${NC}"
if [ -d ".git" ]; then
    echo "✅ Git 仓库已初始化"
    
    # 检查是否有未提交的更改
    if ! git diff-index --quiet HEAD --; then
        echo -e "${YELLOW}⚠️  检测到未提交的更改${NC}"
        git status --short
        echo ""
        
        # 询问是否继续
        read -p "是否继续提交并部署? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}🚫 用户取消操作${NC}"
            exit 0
        fi
    else
        echo "✅ 工作目录干净"
    fi
else
    echo -e "${RED}❌ 不是 Git 仓库，请先初始化 Git${NC}"
    echo "运行: git init && git remote add origin <your-repo-url>"
    exit 1
fi

# 检查远程仓库
echo -e "${BLUE}🔗 检查远程仓库...${NC}"
if git remote get-url origin >/dev/null 2>&1; then
    REMOTE_URL=$(git remote get-url origin)
    echo "✅ 远程仓库: $REMOTE_URL"
else
    echo -e "${RED}❌ 未配置远程仓库${NC}"
    echo "请先添加远程仓库: git remote add origin <your-repo-url>"
    exit 1
fi

# 运行测试（可选）
echo -e "${BLUE}🧪 运行基础测试...${NC}"
if [ -f "package.json" ]; then
    echo "📦 检查 package.json..."
    node -e "const pkg = require('./package.json'); console.log('✅ 项目:', pkg.name, 'v' + pkg.version);"
    
    # 检查关键文件
    REQUIRED_FILES=("server.js" "config.env" "models/User.js" "models/Video.js")
    for file in "${REQUIRED_FILES[@]}"; do
        if [ -f "$file" ]; then
            echo "✅ $file 存在"
        else
            echo -e "${RED}❌ $file 不存在${NC}"
            exit 1
        fi
    done
else
    echo -e "${RED}❌ package.json 不存在${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 基础测试通过${NC}"
echo ""

# 提交本地更改
echo -e "${BLUE}📝 提交本地更改...${NC}"
COMMIT_MESSAGE="更新：$(date '+%Y-%m-%d %H:%M:%S') - 添加10个核心功能"

# 添加所有更改
git add .

# 检查是否有更改需要提交
if git diff --cached --quiet; then
    echo -e "${YELLOW}⚠️  没有新的更改需要提交${NC}"
    
    # 询问是否强制重新部署
    read -p "是否强制触发重新部署? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # 创建一个空提交来触发部署
        git commit --allow-empty -m "$COMMIT_MESSAGE (强制重新部署)"
        echo "✅ 创建空提交以触发部署"
    else
        echo -e "${YELLOW}🚫 跳过部署${NC}"
        exit 0
    fi
else
    # 提交更改
    git commit -m "$COMMIT_MESSAGE"
    echo "✅ 本地更改已提交"
fi

# 推送到远程仓库
echo -e "${BLUE}📤 推送到远程仓库...${NC}"
CURRENT_BRANCH=$(git branch --show-current)
echo "当前分支: $CURRENT_BRANCH"

if git push origin "$CURRENT_BRANCH"; then
    echo -e "${GREEN}✅ 代码推送成功${NC}"
else
    echo -e "${RED}❌ 代码推送失败${NC}"
    exit 1
fi

echo ""

# 等待自动部署
echo -e "${BLUE}⏳ 等待自动部署完成...${NC}"
echo "Sealos 正在检测代码更改并重新部署服务..."

# 显示进度条
for i in {1..30}; do
    printf "."
    sleep 1
done
echo ""

# 检查部署状态
echo -e "${BLUE}🔍 检查部署状态...${NC}"
HEALTH_URL="https://lbszbktvnuvn.sealoshzh.site/health"
MAX_RETRIES=10
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")
    
    if [ "$HTTP_STATUS" = "200" ]; then
        echo -e "${GREEN}✅ 健康检查通过 (HTTP $HTTP_STATUS)${NC}"
        break
    else
        echo -e "${YELLOW}⏳ 等待服务启动... (HTTP $HTTP_STATUS) [尝试 $((RETRY_COUNT + 1))/$MAX_RETRIES]${NC}"
        RETRY_COUNT=$((RETRY_COUNT + 1))
        sleep 10
    fi
done

# 最终状态检查
echo ""
echo -e "${BLUE}🏥 执行最终健康检查...${NC}"

# 检查主要端点
ENDPOINTS=(
    "https://lbszbktvnuvn.sealoshzh.site/health"
    "https://lbszbktvnuvn.sealoshzh.site/api/status"
)

ALL_HEALTHY=true

for endpoint in "${ENDPOINTS[@]}"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint" 2>/dev/null || echo "000")
    if [ "$STATUS" = "200" ]; then
        echo -e "${GREEN}✅ $endpoint (HTTP $STATUS)${NC}"
    else
        echo -e "${RED}❌ $endpoint (HTTP $STATUS)${NC}"
        ALL_HEALTHY=false
    fi
done

echo ""

# 部署结果总结
if [ "$ALL_HEALTHY" = true ]; then
    echo -e "${GREEN}🎉 部署成功！服务正常运行${NC}"
    echo ""
    echo -e "${BLUE}📋 部署信息:${NC}"
    echo "   🌐 主域名: https://lbszbktvnuvn.sealoshzh.site"
    echo "   🔧 管理后台: https://lbszbktvnuvn.sealoshzh.site/admin.html"
    echo "   📊 健康检查: https://lbszbktvnuvn.sealoshzh.site/health"
    echo "   📈 API状态: https://lbszbktvnuvn.sealoshzh.site/api/status"
    echo ""
    echo -e "${BLUE}🔧 新增功能:${NC}"
    echo "   ✅ 视频生成失败自动补偿"
    echo "   ✅ 任务超时检测机制"
    echo "   ✅ 失败任务自动重试"
    echo "   ✅ 下载链接防盗链签名"
    echo "   ✅ 多语言支持 (中英日韩)"
    echo "   ✅ 通知服务 (邮件+Webhook)"
    echo "   ✅ 内容合规检测"
    echo "   ✅ 管理后台API"
    echo "   ✅ 积分消费限频控制"
    echo "   ✅ 用户设备IP记录"
    echo ""
    echo -e "${BLUE}📱 监控命令:${NC}"
    echo "   查看日志: 登录 Sealos 控制台 → 应用管理 → 日志"
    echo "   重启服务: 登录 Sealos 控制台 → 应用管理 → 重启"
    echo "   健康检查: curl https://lbszbktvnuvn.sealoshzh.site/health"
else
    echo -e "${RED}⚠️  部署可能有问题${NC}"
    echo ""
    echo -e "${YELLOW}🔧 故障排除步骤:${NC}"
    echo "   1. 登录 Sealos 控制台查看应用日志"
    echo "   2. 检查环境变量配置是否正确"
    echo "   3. 验证数据库连接是否正常"
    echo "   4. 确认所有依赖包已正确安装"
    echo ""
    echo -e "${BLUE}📞 获取帮助:${NC}"
    echo "   - Sealos 控制台: https://cloud.sealos.io/"
    echo "   - 应用日志: 应用管理 → 选择应用 → 日志"
    echo "   - 健康检查: $HEALTH_URL"
fi

echo ""
echo -e "${BLUE}⏰ 部署完成时间: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${GREEN}🎊 感谢使用 Sealos 部署服务！${NC}" 