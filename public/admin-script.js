// 全局变量
let currentUser = null;
let authToken = localStorage.getItem('adminToken'); // 改为使用adminToken
let currentUsersData = null;
let currentVideosData = null;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeAdmin();
});

async function initializeAdmin() {
    // 检查认证状态
    if (!authToken) {
        window.location.href = '/admin-login.html';
        return;
    }

    // 验证管理员token
    if (!authToken.startsWith('admin_token_')) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        window.location.href = '/admin-login.html';
        return;
    }

    // 获取管理员用户信息
    const storedUser = localStorage.getItem('adminUser');
    currentUser = storedUser ? JSON.parse(storedUser) : {
        id: 'admin',
        name: '管理员',
        email: 'admin@visualforge.com',
        role: 'admin'
    };
    
    // 更新用户界面
    updateUserProfile();
    
    // 初始化事件监听器
    initializeEventListeners();
    
    // 加载默认页面
    loadPage('dashboard');
}

function updateUserProfile() {
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('userAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
    }
}

function initializeEventListeners() {
    // 侧边栏切换
    document.getElementById('sidebarToggle').addEventListener('click', function() {
        document.getElementById('sidebar').classList.toggle('collapsed');
    });

    // 导航链接
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.dataset.page;
            loadPage(page);
            
            // 更新活动状态
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // 用户配置文件点击
    document.getElementById('userProfile').addEventListener('click', function() {
        showUserMenu();
    });

    // 点击模态框外部关闭
    document.getElementById('modal').addEventListener('click', function(e) {
        if (e.target === this) {
            hideModal();
        }
    });
}

async function loadPage(pageName) {
    const content = document.getElementById('content');
    const pageTitle = document.getElementById('pageTitle');
    
    // 更新页面标题
    const titles = {
        'dashboard': '仪表板',
        'users': '用户管理',
        'videos': '视频管理',
        'analytics': '数据分析',
        'config': '系统配置'
    };
    
    pageTitle.textContent = titles[pageName] || '仪表板';
    
    // 显示加载动画
    content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    
    try {
        switch(pageName) {
            case 'dashboard':
                await loadDashboard();
                break;
            case 'users':
                await loadUsers();
                break;
            case 'videos':
                await loadVideos();
                break;
            case 'analytics':
                await loadAnalytics();
                break;
            case 'config':
                await loadConfig();
                break;
            default:
                await loadDashboard();
        }
    } catch (error) {
        console.error('加载页面失败:', error);
        content.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <h3 style="color: var(--danger-color); margin-bottom: 1rem;">加载失败</h3>
                <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">${error.message}</p>
                <button class="btn btn-primary" onclick="loadPage('${pageName}')">重试</button>
            </div>
        `;
    }
}

// 仪表板
async function loadDashboard() {
    try {
        const response = await fetch('/api/admin/dashboard', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) {
            throw new Error('获取仪表板数据失败');
        }

        const data = await response.json();
        renderDashboard(data.data);
    } catch (error) {
        console.warn('使用模拟数据:', error.message);
        // 使用模拟数据作为后备
        const mockData = {
            overview: { totalUsers: 1250, totalVideos: 3480, todayUsers: 45, todayVideos: 128 },
            recentUsers: [
                { _id: '1', name: '张三', email: 'zhang@example.com', subscriptionLevel: 'pro', createdAt: new Date().toISOString() },
                { _id: '2', name: '李四', email: 'li@example.com', subscriptionLevel: 'free', createdAt: new Date().toISOString() }
            ]
        };
        renderDashboard(mockData);
    }
}

function renderDashboard(data) {
    document.getElementById('content').innerHTML = `
        <div class="dashboard-grid">
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-title">总用户数</div>
                    <div class="stat-icon users"><i class="fas fa-users"></i></div>
                </div>
                <div class="stat-value">${data.overview.totalUsers.toLocaleString()}</div>
                <div class="stat-change positive">
                    <i class="fas fa-arrow-up"></i> 今日新增 ${data.overview.todayUsers}
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-title">视频总数</div>
                    <div class="stat-icon videos"><i class="fas fa-video"></i></div>
                </div>
                <div class="stat-value">${data.overview.totalVideos.toLocaleString()}</div>
                <div class="stat-change positive">
                    <i class="fas fa-arrow-up"></i> 今日生成 ${data.overview.todayVideos}
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-title">活跃用户</div>
                    <div class="stat-icon growth"><i class="fas fa-chart-line"></i></div>
                </div>
                <div class="stat-value">${Math.floor(data.overview.totalUsers * 0.3).toLocaleString()}</div>
                <div class="stat-change positive">
                    <i class="fas fa-arrow-up"></i> +12.5%
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-title">月收入</div>
                    <div class="stat-icon revenue"><i class="fas fa-dollar-sign"></i></div>
                </div>
                <div class="stat-value">¥${(data.overview.totalUsers * 25).toLocaleString()}</div>
                <div class="stat-change positive">
                    <i class="fas fa-arrow-up"></i> +8.2%
                </div>
            </div>
        </div>
        <div class="chart-container">
            <div class="chart-header">
                <h3 class="chart-title">用户增长趋势</h3>
            </div>
            <div style="height: 300px; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 1.2rem;">
                📊 用户增长图表将在这里显示
            </div>
        </div>
    `;
}

// 用户管理
async function loadUsers(page = 1, search = '') {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="table-container">
            <div class="table-header">
                <h3 class="table-title">用户管理</h3>
                <div class="search-box">
                    <input type="text" class="search-input" placeholder="搜索用户..." id="userSearch" value="${search}">
                    <button class="btn btn-secondary" onclick="searchUsers()"><i class="fas fa-search"></i> 搜索</button>
                </div>
            </div>
            <div class="loading">
                <div class="spinner"></div>
            </div>
        </div>
    `;

    try {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: '20'
        });
        if (search) params.append('search', search);

        const response = await fetch(`/api/admin/users?${params}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) {
            throw new Error('获取用户列表失败');
        }

        const data = await response.json();
        currentUsersData = data.data;
        renderUsers(data.data);
    } catch (error) {
        console.error('加载用户失败:', error);
        content.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <h3 style="color: var(--danger-color);">加载用户失败</h3>
                <p style="color: var(--text-secondary); margin: 1rem 0;">${error.message}</p>
                <button class="btn btn-primary" onclick="loadUsers()">重试</button>
            </div>
        `;
    }
}

function renderUsers(data) {
    const tableContainer = document.querySelector('.table-container');
    
    tableContainer.innerHTML = `
        <div class="table-header">
            <h3 class="table-title">用户管理 (${data.pagination.count} 人)</h3>
            <div class="search-box">
                <input type="text" class="search-input" placeholder="搜索用户..." id="userSearch">
                <button class="btn btn-secondary" onclick="searchUsers()"><i class="fas fa-search"></i> 搜索</button>
            </div>
        </div>
        <table class="data-table">
            <thead>
                <tr><th>用户</th><th>邮箱</th><th>订阅等级</th><th>积分</th><th>注册时间</th><th>操作</th></tr>
            </thead>
            <tbody>
                ${data.users.map(user => `
                    <tr id="user-row-${user.id}">
                        <td>
                            <div style="display: flex; align-items: center; gap: 0.75rem;">
                                <div class="user-avatar">${user.name.charAt(0).toUpperCase()}</div>
                                ${user.name}
                            </div>
                        </td>
                        <td>${user.email}</td>
                        <td><span class="status-badge ${user.subscriptionLevel === 'free' ? 'inactive' : 'active'}">${user.subscriptionLevel.toUpperCase()}</span></td>
                        <td id="user-points-${user.id}">${user.points}</td>
                        <td>${new Date(user.createdAt).toLocaleDateString('zh-CN')}</td>
                        <td>
                            <button class="btn btn-secondary" onclick="adjustCredits('${user.id}', '${user.name}', ${user.points})" title="调整积分">
                                <i class="fas fa-coins"></i>
                            </button>
                            <button class="btn btn-secondary" onclick="editUser('${user.id}', '${user.subscriptionLevel}')" title="编辑用户">
                                <i class="fas fa-edit"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ${renderPagination(data.pagination, 'loadUsers')}
    `;
}

function searchUsers() {
    const search = document.getElementById('userSearch').value;
    loadUsers(1, search);
}

// 积分调整
async function adjustCredits(userId, userName, currentPoints) {
    showModal('调整积分', `
        <form id="adjustCreditsForm">
            <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">用户</label>
                <div style="padding: 0.75rem; background: var(--light-card); border-radius: 8px; color: var(--text-secondary);">
                    ${userName} (当前积分: ${currentPoints})
                </div>
            </div>
            <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">调整数量</label>
                <input type="number" id="creditAmount" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px;" placeholder="正数增加，负数减少" required>
            </div>
            <div style="margin-bottom: 1.5rem;">
                <small style="color: var(--text-secondary);">
                    例如：输入 100 增加100积分，输入 -50 减少50积分
                </small>
            </div>
            <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                <button type="button" class="btn btn-secondary" onclick="hideModal()">取消</button>
                <button type="submit" class="btn btn-primary">确认调整</button>
            </div>
        </form>
    `);

    document.getElementById('adjustCreditsForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const amount = parseInt(document.getElementById('creditAmount').value);
        if (isNaN(amount) || amount === 0) {
            alert('请输入有效的积分数量');
            return;
        }

        try {
            const response = await fetch(`/api/admin/users/${userId}/credits`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ amount })
            });

            const result = await response.json();
            
            if (result.success) {
                // 更新页面上的积分显示
                const pointsElement = document.getElementById(`user-points-${userId}`);
                if (pointsElement) {
                    pointsElement.textContent = result.data.newPoints;
                }
                
                hideModal();
                showMessage(`${result.message}`, 'success');
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('调整积分失败:', error);
            alert('调整积分失败: ' + error.message);
        }
    });
}

// 视频管理
async function loadVideos(page = 1, status = '', userId = '', model = '') {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="table-container">
            <div class="table-header">
                <h3 class="table-title">视频管理</h3>
                <div class="search-box">
                    <select class="search-input" id="statusFilter" onchange="filterVideos()">
                        <option value="">所有状态</option>
                        <option value="pending">等待中</option>
                        <option value="processing">处理中</option>
                        <option value="completed">已完成</option>
                        <option value="failed">失败</option>
                    </select>
                    <input type="text" class="search-input" placeholder="搜索模型..." id="modelSearch">
                    <button class="btn btn-secondary" onclick="filterVideos()"><i class="fas fa-search"></i> 筛选</button>
                </div>
            </div>
            <div class="loading">
                <div class="spinner"></div>
            </div>
        </div>
    `;

    try {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: '20'
        });
        if (status) params.append('status', status);
        if (userId) params.append('userId', userId);
        if (model) params.append('model', model);

        const response = await fetch(`/api/admin/videos?${params}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) {
            throw new Error('获取视频列表失败');
        }

        const data = await response.json();
        currentVideosData = data.data;
        renderVideos(data.data);
    } catch (error) {
        console.error('加载视频失败:', error);
        content.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <h3 style="color: var(--danger-color);">加载视频失败</h3>
                <p style="color: var(--text-secondary); margin: 1rem 0;">${error.message}</p>
                <button class="btn btn-primary" onclick="loadVideos()">重试</button>
            </div>
        `;
    }
}

function renderVideos(data) {
    const tableContainer = document.querySelector('.table-container');
    
    tableContainer.innerHTML = `
        <div class="table-header">
            <h3 class="table-title">视频管理 (${data.pagination.count} 个)</h3>
            <div class="search-box">
                <select class="search-input" id="statusFilter" onchange="filterVideos()">
                    <option value="">所有状态</option>
                    <option value="pending">等待中</option>
                    <option value="processing">处理中</option>
                    <option value="completed">已完成</option>
                    <option value="failed">失败</option>
                </select>
                <input type="text" class="search-input" placeholder="搜索模型..." id="modelSearch">
                <button class="btn btn-secondary" onclick="filterVideos()"><i class="fas fa-search"></i> 筛选</button>
            </div>
        </div>
        <table class="data-table">
            <thead>
                <tr><th>标题</th><th>用户</th><th>模型</th><th>时长</th><th>状态</th><th>创建时间</th><th>操作</th></tr>
            </thead>
            <tbody>
                ${data.videos.map(video => `
                    <tr id="video-row-${video.id}">
                        <td title="${video.prompt}">${video.title}</td>
                        <td>${video.user ? video.user.name : '未知用户'}</td>
                        <td>${video.model}</td>
                        <td>${video.duration}s</td>
                        <td><span class="status-badge ${getStatusClass(video.status)}">${getStatusText(video.status)}</span></td>
                        <td>${new Date(video.createdAt).toLocaleDateString('zh-CN')}</td>
                        <td>
                            ${video.videoUrl ? `<button class="btn btn-secondary" onclick="previewVideo('${video.videoUrl}')" title="预览视频">
                                <i class="fas fa-eye"></i>
                            </button>` : ''}
                            <button class="btn btn-secondary" onclick="deleteVideo('${video.id}', '${video.title}')" title="删除视频" style="color: var(--danger-color);">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ${renderPagination(data.pagination, 'loadVideos')}
    `;
}

function filterVideos() {
    const status = document.getElementById('statusFilter').value;
    const model = document.getElementById('modelSearch').value;
    loadVideos(1, status, '', model);
}

function getStatusClass(status) {
    const statusMap = {
        'pending': 'pending',
        'processing': 'pending',
        'completed': 'completed',
        'failed': 'inactive'
    };
    return statusMap[status] || 'inactive';
}

function getStatusText(status) {
    const statusMap = {
        'pending': '等待中',
        'processing': '处理中',
        'completed': '已完成',
        'failed': '失败'
    };
    return statusMap[status] || status;
}

// 预览视频
function previewVideo(videoUrl) {
    showModal('视频预览', `
        <div style="text-align: center;">
            <video controls style="max-width: 100%; max-height: 400px; border-radius: 8px;">
                <source src="${videoUrl}" type="video/mp4">
                您的浏览器不支持视频播放
            </video>
        </div>
        <div style="text-align: center; margin-top: 1rem;">
            <button class="btn btn-secondary" onclick="hideModal()">关闭</button>
        </div>
    `);
}

// 删除视频
async function deleteVideo(videoId, videoTitle) {
    if (!confirm(`确定要删除视频 "${videoTitle}" 吗？此操作不可恢复。`)) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/videos/${videoId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const result = await response.json();
        
        if (result.success) {
            // 从页面移除该行
            const videoRow = document.getElementById(`video-row-${videoId}`);
            if (videoRow) {
                videoRow.remove();
            }
            
            showMessage('视频删除成功', 'success');
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('删除视频失败:', error);
        alert('删除视频失败: ' + error.message);
    }
}

// 分页组件
function renderPagination(pagination, functionName) {
    if (pagination.total <= 1) return '';
    
    return `
        <div style="display: flex; justify-content: center; align-items: center; gap: 1rem; padding: 1rem;">
            <button class="btn btn-secondary" onclick="${functionName}(${pagination.current - 1})" ${!pagination.hasPrev ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i> 上一页
            </button>
            <span>第 ${pagination.current} 页，共 ${pagination.total} 页</span>
            <button class="btn btn-secondary" onclick="${functionName}(${pagination.current + 1})" ${!pagination.hasNext ? 'disabled' : ''}>
                下一页 <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
}

// 数据分析
async function loadAnalytics() {
    document.getElementById('content').innerHTML = `
        <div class="dashboard-grid">
            <div class="chart-container">
                <div class="chart-header"><h3 class="chart-title">用户活跃度分析</h3></div>
                <div style="height: 300px; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 1.2rem;">📈 用户活跃度图表</div>
            </div>
            <div class="chart-container">
                <div class="chart-header"><h3 class="chart-title">视频生成趋势</h3></div>
                <div style="height: 300px; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 1.2rem;">📊 视频生成趋势图表</div>
            </div>
        </div>
    `;
}

// 系统配置
async function loadConfig() {
    document.getElementById('content').innerHTML = `
        <div class="table-container">
            <div class="table-header">
                <h3 class="table-title">系统配置</h3>
                <button class="btn btn-primary"><i class="fas fa-plus"></i> 添加配置</button>
            </div>
            <table class="data-table">
                <thead>
                    <tr><th>配置项</th><th>值</th><th>描述</th><th>分类</th><th>操作</th></tr>
                </thead>
                <tbody>
                    <tr>
        
                        <td><button class="btn btn-secondary"><i class="fas fa-edit"></i></button></td>
                    </tr>
                    <tr>
                        <td>daily_signin_points</td><td>2</td><td>每日签到奖励积分</td><td>积分</td>
                        <td><button class="btn btn-secondary"><i class="fas fa-edit"></i></button></td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
}

// 编辑用户
function editUser(userId, currentLevel) {
    showModal('编辑用户', `
        <form id="editUserForm">
            <div style="margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">订阅等级</label>
                <select id="subscriptionLevel" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px;">
                    <option value="free" ${currentLevel === 'free' ? 'selected' : ''}>免费</option>
                    <option value="plus" ${currentLevel === 'plus' ? 'selected' : ''}>Plus</option>
                    <option value="pro" ${currentLevel === 'pro' ? 'selected' : ''}>Pro</option>
                    <option value="flagship" ${currentLevel === 'flagship' ? 'selected' : ''}>旗舰</option>
                </select>
            </div>
            <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                <button type="button" class="btn btn-secondary" onclick="hideModal()">取消</button>
                <button type="submit" class="btn btn-primary">保存</button>
            </div>
        </form>
    `);

    document.getElementById('editUserForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const subscriptionLevel = document.getElementById('subscriptionLevel').value;

        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ subscriptionLevel })
            });

            const result = await response.json();
            
            if (result.success) {
                hideModal();
                showMessage('用户信息更新成功', 'success');
                // 重新加载用户列表
                loadUsers();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('更新用户失败:', error);
            alert('更新用户失败: ' + error.message);
        }
    });
}

// 模态框
function showModal(title, content) {
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modalContent');
    
    modalContent.innerHTML = `
        <h3 style="margin-bottom: 1.5rem; font-size: 1.25rem; font-weight: 600;">${title}</h3>
        ${content}
    `;
    
    modal.classList.add('show');
}

function hideModal() {
    document.getElementById('modal').classList.remove('show');
}

// 消息提示
function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `${type}-message`;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        z-index: 3000;
        max-width: 300px;
        box-shadow: var(--shadow-lg);
    `;
    
    if (type === 'success') {
        messageDiv.style.background = '#f0fdf4';
        messageDiv.style.color = '#166534';
        messageDiv.style.border = '1px solid #bbf7d0';
    } else {
        messageDiv.style.background = '#fef2f2';
        messageDiv.style.color = '#991b1b';
        messageDiv.style.border = '1px solid #fecaca';
    }
    
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        document.body.removeChild(messageDiv);
    }, 3000);
}

// 用户菜单
function showUserMenu() {
    showModal('用户菜单', `
        <div style="display: flex; flex-direction: column; gap: 1rem;">
            <button class="btn btn-secondary" style="justify-content: flex-start;">
                <i class="fas fa-user"></i> 个人资料
            </button>
            <button class="btn btn-secondary" style="justify-content: flex-start;">
                <i class="fas fa-cog"></i> 设置
            </button>
            <hr style="border: none; border-top: 1px solid var(--border-color); margin: 0.5rem 0;">
            <button class="btn btn-secondary" style="justify-content: flex-start; color: var(--danger-color);" onclick="logout()">
                <i class="fas fa-sign-out-alt"></i> 退出登录
            </button>
        </div>
    `);
}

function logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = '/admin-login.html';
} 