#!/bin/bash

# 启动AI视频生成后端服务
echo "🚀 启动AI视频生成后端服务..."

# 确保在正确的目录
cd /home/devbox/project

# 启动服务器
exec node --no-deprecation server.js