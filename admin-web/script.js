const API_BASE_URL = 'http://139.196.185.197:7070/doo/server/api';

let currentMenu = 'user';
let currentData = [];
let editingItem = null;
let recommendationMetrics = {};
let chartInstances = {};
let isLoading = false;
let currentPage = 1;
let currentLimit = 10;
let totalItems = 0;

const menuItems = document.querySelectorAll('.menu-item');
const menuTitle = document.getElementById('menuTitle');
const tableBody = document.getElementById('tableBody');
const tableHeader = document.querySelector('.table-header');
const addBtn = document.getElementById('addBtn');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');
const modalCancel = document.getElementById('modalCancel');
const modalConfirm = document.getElementById('modalConfirm');
const adminName = document.getElementById('adminName');
const logoutBtn = document.getElementById('logoutBtn');

function checkAuth() {
	const adminInfo = localStorage.getItem('adminInfo');
	if (!adminInfo) {
		window.location.href = 'login.html';
		return false;
	}
	return JSON.parse(adminInfo);
}

async function init() {
	try {
		const adminInfo = checkAuth();
		if (!adminInfo) {
			return;
		}

		adminName.textContent = adminInfo.nickname || adminInfo.username || '管理员';
		bindEvents();
		await switchMenu('user');
	} catch (error) {
		console.error('初始化错误:', error);
	}
}

function bindEvents() {
	menuItems.forEach(item => {
		item.addEventListener('click', () => {
			switchMenu(item.dataset.menu);
		});
	});

	addBtn.addEventListener('click', handleAdd);
	modalClose.addEventListener('click', closeModal);
	modalCancel.addEventListener('click', closeModal);
	modalConfirm.addEventListener('click', handleModalConfirm);
	logoutBtn.addEventListener('click', handleLogout);

	modal.addEventListener('click', (e) => {
		if (e.target === modal) {
			closeModal();
		}
	});
}

async function handleModalConfirm() {
	if (currentMenu === 'content' && editingItem) {
		handleContentUpdate();
	} else {
		// 处理添加功能
		await handleAddItem();
	}
}

async function handleAddItem() {
	
	try {
		let formData;
		let apiUrl;
		let method = 'POST';
		
		showLoading();
		
		if (currentMenu === 'video') {
			const title = document.getElementById('formTitle').value;
			const description = document.getElementById('formDescription').value;
			const videoUrl = document.getElementById('formVideoUrl').value;
			const coverUrl = document.getElementById('formCoverUrl').value;
			
			if (!title || !videoUrl) {
				showToast('请输入标题和视频URL');
				hideLoading();
				return;
			}
			
			formData = {
				title: title,
				description: description,
				video_url: videoUrl,
				cover_url: coverUrl
			};
			apiUrl = `${API_BASE_URL}/admin_content.php`;
			
		} else if (currentMenu === 'user') {
			const username = document.getElementById('formUsername').value;
			const nickname = document.getElementById('formNickname').value;
			const password = document.getElementById('formPassword').value;
			const avatar = document.getElementById('formAvatar').value;
			const backgroundImage = document.getElementById('formBackgroundImage').value;
			const role = document.getElementById('formRole').value;
			
			if (!username || !password) {
				showToast('请输入用户名和密码');
				hideLoading();
				return;
			}
			
			formData = {
				username: username,
				nickname: nickname,
				password: password,
				avatar: avatar,
				background_image: backgroundImage,
				role: role
			};
			apiUrl = `${API_BASE_URL}/admin_users.php`;
			
		} else if (currentMenu === 'carousel') {
			const title = document.getElementById('formTitle').value;
			const author = document.getElementById('formAuthor').value;
			const imageUrl = document.getElementById('formImageUrl').value;
			const sortOrder = document.getElementById('formSortOrder').value;
			const isActive = document.getElementById('formIsActive').value;
			
			if (!title || !imageUrl) {
				showToast('请输入标题和图片URL');
				hideLoading();
				return;
			}
			
			formData = {
				title: title,
				author: author,
				image_url: imageUrl,
				sort_order: sortOrder,
				is_active: isActive
			};
			apiUrl = `${API_BASE_URL}/admin_carousels.php`;
			
		} else if (currentMenu === 'version') {
			const version = document.getElementById('formVersion').value;
			const description = document.getElementById('formDescription').value;
			const apkFile = document.getElementById('formApkFile').files[0];
			
			if (!version) {
				showToast('请输入版本号');
				hideLoading();
				return;
			}
			
			// 处理文件上传
			if (apkFile) {
				const formData = new FormData();
				formData.append('version', version);
				formData.append('description', description);
				formData.append('apk_file', apkFile);
				
				const response = await fetch(`${API_BASE_URL}/upload_version.php`, {
					method: 'POST',
					credentials: 'include',
					body: formData
				});
				
				const responseText = await response.text();
				if (!responseText) {
							showToast('服务器返回空响应');
							hideLoading();
							return;
						}
				
				let result;
				try {
					result = JSON.parse(responseText);
				} catch (e) {
							showToast('数据格式错误');
							hideLoading();
							return;
						}
				
				if (result.code === 200) {
							showToast('添加成功', 'success');
							closeModal();
							hideLoading();
							await loadData();
						} else {
							showToast('添加失败: ' + result.message);
							hideLoading();
						}
						return;
			}
			
			formData = {
				version: version,
				description: description
			};
			apiUrl = `${API_BASE_URL}/upload_version.php`;
			
		} else if (currentMenu === 'announcement') {
			const title = document.getElementById('formTitle').value;
			const content = document.getElementById('formContent').value;
			
			if (!title || !content) {
				showToast('请输入公告标题和内容');
				hideLoading();
				return;
			}
			
			formData = {
				action: 'create_announcement',
				title: title,
				content: content
			};
			apiUrl = `${API_BASE_URL}/announcements.php`;
			
		} else if (currentMenu === 'recommendation') {
			const algorithm = document.getElementById('formAlgorithm').value;
			const enabled = document.getElementById('formEnabled').value;
			const weight = document.getElementById('formWeight').value;
			const description = document.getElementById('formDescription').value;
			
			if (!algorithm) {
				showToast('请选择算法类型');
				hideLoading();
				return;
			}
			
			formData = {
				algorithm: algorithm,
				enabled: enabled,
				weight: weight,
				description: description
			};
			apiUrl = `${API_BASE_URL}/admin_recommendations.php`;
			
		} else {
				showToast('不支持的菜单类型');
				hideLoading();
				return;
			}
		
		// 发送请求
		const response = await fetch(apiUrl, {
			method: method,
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(formData)
		});
		
		// 处理响应
			const responseText = await response.text();
			if (!responseText) {
				showToast('服务器返回空响应');
				hideLoading();
				return;
			}
		
		let result;
			try {
				result = JSON.parse(responseText);
			} catch (e) {
				showToast('数据格式错误');
				hideLoading();
				return;
			}
		
		if (result.code === 200) {
				showToast('添加成功', 'success');
				closeModal();
				hideLoading();
				await loadData();
			} else {
				showToast('添加失败: ' + result.message);
				hideLoading();
			}
		
	} catch (error) {
		console.error('添加项目错误:', error);
		showToast('网络错误，请稍后重试');
	} finally {
		hideLoading();
	}
}

async function switchMenu(menu) {
	currentMenu = menu;
	
	// 重置分页参数
	currentPage = 1;
	currentLimit = 10;
	totalItems = 0;
	
	menuItems.forEach(item => {
		item.classList.remove('active');
		if (item.dataset.menu === menu) {
			item.classList.add('active');
		}
	});

	// 移除之前可能存在的推荐系统性能指标容器
	const existingMetricsContainer = document.querySelector('.recommendation-metrics');
	if (existingMetricsContainer) {
		existingMetricsContainer.remove();
	}

	// 移除推荐管理工具栏按钮
	const existingAnalysisBtn = document.getElementById('analysisBtn');
	if (existingAnalysisBtn) {
		existingAnalysisBtn.remove();
	}
	const existingMonitorBtn = document.getElementById('monitorBtn');
	if (existingMonitorBtn) {
		existingMonitorBtn.remove();
	}
	const existingAbTestBtn = document.getElementById('abTestBtn');
	if (existingAbTestBtn) {
		existingAbTestBtn.remove();
	}

	const titles = {
									user: '用户管理',
									content: '内容管理',
									stats: '数据统计',
									logs: '系统日志',
									carousel: '轮播图管理',
									version: '版本管理',
									announcement: '公告管理',
									recommendation: '智能推荐管理',
									user_profile: '用户画像分析',
									content_similarity: '内容相似度分析',
									article: '文章管理',
									feedback: '问题反馈管理'
								};
	
	
	if (titles[menu]) {
		menuTitle.textContent = titles[menu];
	} else {
		console.error('未找到对应标题:', menu);
		menuTitle.textContent = '智能推荐管理';
	}

	
	// 根据菜单类型显示或隐藏添加按钮
										if (menu === 'content' || menu === 'stats' || menu === 'logs' || menu === 'recommendation' || menu === 'user_profile' || menu === 'content_similarity' || menu === 'feedback') {
											addBtn.style.display = 'none';
										} else {
											addBtn.style.display = 'inline-block';
										}
								
								// 为日志菜单添加筛选功能
								if (menu === 'logs') {
									// 移除现有的筛选表单
									const existingFilterForm = document.querySelector('.filter-form');
									if (existingFilterForm) {
										existingFilterForm.remove();
									}
									
									// 创建筛选表单
									const filterForm = document.createElement('div');
									filterForm.className = 'filter-form';
									filterForm.style.marginBottom = '20px';
									filterForm.style.padding = '15px';
									filterForm.style.backgroundColor = '#f8f9fa';
									filterForm.style.borderRadius = '8px';
									filterForm.style.display = 'flex';
									filterForm.style.gap = '15px';
									filterForm.style.alignItems = 'flex-end';
									
									// 日志类型筛选
									const typeFilter = document.createElement('div');
									typeFilter.style.display = 'flex';
									typeFilter.style.flexDirection = 'column';
									typeFilter.style.gap = '5px';
									
									const typeLabel = document.createElement('label');
									typeLabel.textContent = '日志类型';
									typeLabel.style.fontSize = '14px';
									typeLabel.style.fontWeight = 'bold';
									typeLabel.style.color = '#333';
									
									const typeSelect = document.createElement('select');
									typeSelect.id = 'logTypeFilter';
									typeSelect.style.padding = '8px 12px';
									typeSelect.style.border = '1px solid #ddd';
									typeSelect.style.borderRadius = '4px';
									typeSelect.style.fontSize = '14px';
									
									const typeOptions = [
										{ value: '', text: '全部类型' },
										{ value: 'login', text: '登录' },
										{ value: 'admin', text: '管理员操作' },
										{ value: 'content', text: '内容操作' },
										{ value: 'follow', text: '关注操作' },
										{ value: 'recommendation', text: '推荐操作' }
									];
									
									typeOptions.forEach(option => {
										const opt = document.createElement('option');
										opt.value = option.value;
										opt.textContent = option.text;
										typeSelect.appendChild(opt);
									});
									
									typeFilter.appendChild(typeLabel);
									typeFilter.appendChild(typeSelect);
									filterForm.appendChild(typeFilter);
									
									// 用户ID筛选
									const userIdFilter = document.createElement('div');
									userIdFilter.style.display = 'flex';
									userIdFilter.style.flexDirection = 'column';
									userIdFilter.style.gap = '5px';
									
									const userIdLabel = document.createElement('label');
									userIdLabel.textContent = '用户ID';
									userIdLabel.style.fontSize = '14px';
									userIdLabel.style.fontWeight = 'bold';
									userIdLabel.style.color = '#333';
									
									const userIdInput = document.createElement('input');
									userIdInput.id = 'logUserIdFilter';
									userIdInput.type = 'number';
									userIdInput.placeholder = '输入用户ID';
									userIdInput.style.padding = '8px 12px';
									userIdInput.style.border = '1px solid #ddd';
									userIdInput.style.borderRadius = '4px';
									userIdInput.style.fontSize = '14px';
									
									userIdFilter.appendChild(userIdLabel);
									userIdFilter.appendChild(userIdInput);
									filterForm.appendChild(userIdFilter);
									
									// 筛选按钮
									const filterButton = document.createElement('button');
									filterButton.className = 'btn btn-primary';
									filterButton.textContent = '筛选';
									filterButton.style.padding = '8px 20px';
									filterButton.style.height = '36px';
									filterButton.addEventListener('click', () => {
										currentPage = 1;
										loadData();
									});
									filterForm.appendChild(filterButton);
									
									// 重置按钮
									const resetButton = document.createElement('button');
									resetButton.className = 'btn btn-secondary';
									resetButton.textContent = '重置';
									resetButton.style.padding = '8px 20px';
									resetButton.style.height = '36px';
									resetButton.addEventListener('click', () => {
										document.getElementById('logTypeFilter').value = '';
										document.getElementById('logUserIdFilter').value = '';
										currentPage = 1;
										loadData();
									});
									filterForm.appendChild(resetButton);
									
									// 添加到内容体
									const contentBody = document.querySelector('.content-body');
									if (contentBody) {
										contentBody.insertBefore(filterForm, contentBody.firstChild);
									}
								} else {
									// 移除筛选表单
									const existingFilterForm = document.querySelector('.filter-form');
									if (existingFilterForm) {
										existingFilterForm.remove();
									}
								}

		// 为推荐管理菜单添加特殊功能
			if (menu === 'recommendation') {
				// 添加推荐管理工具栏
				const contentHeader = document.querySelector('.content-header');
				if (contentHeader) {
					// 添加分析按钮
					const analysisBtn = document.createElement('button');
					analysisBtn.className = 'btn btn-secondary';
					analysisBtn.textContent = '查看分析报告';
					analysisBtn.id = 'analysisBtn';
					analysisBtn.style.marginLeft = '10px';
					analysisBtn.style.display = 'inline-block';
					analysisBtn.onclick = showRecommendationAnalysis;
					
					// 添加实时监控按钮
					const monitorBtn = document.createElement('button');
					monitorBtn.className = 'btn btn-primary';
					monitorBtn.textContent = '实时监控';
					monitorBtn.id = 'monitorBtn';
					monitorBtn.style.marginLeft = '10px';
					monitorBtn.style.display = 'inline-block';
					monitorBtn.onclick = showRealTimeMonitor;
					
					// 添加A/B测试按钮
									const abTestBtn = document.createElement('button');
									abTestBtn.className = 'btn btn-info';
									abTestBtn.textContent = 'A/B测试';
									abTestBtn.id = 'abTestBtn';
									abTestBtn.style.marginLeft = '10px';
									abTestBtn.style.display = 'inline-block';
									abTestBtn.onclick = showAbTestManager;
									
									// 添加手动推荐按钮
									const manualRecommendBtn = document.createElement('button');
									manualRecommendBtn.className = 'btn btn-success';
									manualRecommendBtn.textContent = '手动推荐';
									manualRecommendBtn.id = 'manualRecommendBtn';
									manualRecommendBtn.style.marginLeft = '10px';
									manualRecommendBtn.style.display = 'inline-block';
									manualRecommendBtn.onclick = showManualRecommendation;
					
					// 移除已存在的按钮
									const existingAnalysisBtn = document.getElementById('analysisBtn');
									if (existingAnalysisBtn) {
										existingAnalysisBtn.remove();
									}
									const existingMonitorBtn = document.getElementById('monitorBtn');
									if (existingMonitorBtn) {
										existingMonitorBtn.remove();
									}
									const existingAbTestBtn = document.getElementById('abTestBtn');
									if (existingAbTestBtn) {
										existingAbTestBtn.remove();
									}
									const existingManualRecommendBtn = document.getElementById('manualRecommendBtn');
									if (existingManualRecommendBtn) {
										existingManualRecommendBtn.remove();
									}
					
					// 添加到头部
									const headerActions = contentHeader.querySelector('.header-actions');
									if (headerActions) {
										headerActions.appendChild(analysisBtn);
										headerActions.appendChild(monitorBtn);
										headerActions.appendChild(abTestBtn);
										headerActions.appendChild(manualRecommendBtn);
									}
				}
			}

		const headers = {
			user: `
				<div class="table-cell cell-id">ID</div>
				<div class="table-cell cell-avatar">头像</div>
				<div class="table-cell cell-username">用户名</div>
				<div class="table-cell cell-nickname">昵称</div>
				<div class="table-cell cell-role">角色</div>
				<div class="table-cell cell-time">注册时间</div>
				<div class="table-cell cell-actions">操作</div>
			`,
			content: `
						<div class="table-cell cell-id">ID</div>
						<div class="table-cell cell-publisher">发布者</div>
						<div class="table-cell cell-title">标题</div>
						<div class="table-cell cell-image">图片</div>
						<div class="table-cell cell-content">内容</div>
						<div class="table-cell cell-likes">点赞数</div>
						<div class="table-cell cell-comments">评论数</div>
						<div class="table-cell cell-time">发布时间</div>
						<div class="table-cell cell-actions">操作</div>
					`,
			
			stats: `
				<!-- 数据统计页面不需要表头 -->
			`,
			logs: `
				<div class="table-cell cell-id">ID</div>
				<div class="table-cell cell-username">操作人</div>
				<div class="table-cell cell-type">日志类型</div>
				<div class="table-cell cell-action">操作</div>
				<div class="table-cell cell-message">日志消息</div>
				<div class="table-cell cell-ip">IP地址</div>
				<div class="table-cell cell-time">操作时间</div>
			`,
			carousel: `
				<div class="table-cell cell-id">ID</div>
				<div class="table-cell cell-title">标题</div>
				<div class="table-cell cell-author">作者</div>
				<div class="table-cell cell-image">图片</div>
				<div class="table-cell cell-sort">排序</div>
				<div class="table-cell cell-actions">操作</div>
			`,
			version: `
				<div class="table-cell cell-id">ID</div>
				<div class="table-cell cell-version">版本号</div>
				<div class="table-cell cell-desc">描述</div>
				<div class="table-cell cell-date">发布时间</div>
				<div class="table-cell cell-actions">操作</div>
			`,
			announcement: `
				<div class="table-cell cell-id">ID</div>
				<div class="table-cell cell-title">标题</div>
				<div class="table-cell cell-content">内容</div>
				<div class="table-cell cell-date">发布时间</div>
				<div class="table-cell cell-actions">操作</div>
			`,
			recommendation: `
					<div class="table-cell cell-id">ID</div>
					<div class="table-cell cell-type">算法类型</div>
					<div class="table-cell cell-shows">展示次数</div>
					<div class="table-cell cell-clicks">点击次数</div>
					<div class="table-cell cell-ctr">点击率</div>
					<div class="table-cell cell-status">状态</div>
					<div class="table-cell cell-actions">操作</div>
				`,
			user_profile: `
					<div class="table-cell cell-id">用户ID</div>
					<div class="table-cell cell-username">用户名</div>
					<div class="table-cell cell-nickname">昵称</div>
					<div class="table-cell cell-behaviors">行为次数</div>
					<div class="table-cell cell-tags">偏好标签</div>
					<div class="table-cell cell-time">注册时间</div>
					<div class="table-cell cell-actions">操作</div>
				`,
			content_similarity: `
										<div class="table-cell cell-id">ID</div>
										<div class="table-cell cell-content1">内容</div>
										<div class="table-cell cell-image">图片</div>
										<div class="table-cell cell-similarity">相似度</div>
										<div class="table-cell cell-tag-similarity">标签相似度</div>
										<div class="table-cell cell-category-similarity">分类相似度</div>
										<div class="table-cell cell-actions">操作</div>
									`,
									article: `
										<div class="table-cell cell-id">ID</div>
										<div class="table-cell cell-title">标题</div>
										<div class="table-cell cell-author">作者</div>
										<div class="table-cell cell-date">发布时间</div>
										<div class="table-cell cell-status">状态</div>
										<div class="table-cell cell-actions">操作</div>
									`,
									feedback: `
										<div class="table-cell cell-id">ID</div>
										<div class="table-cell cell-username">提交用户</div>
										<div class="table-cell cell-type">反馈类型</div>
										<div class="table-cell cell-content">反馈内容</div>
										<div class="table-cell cell-contact">联系方式</div>
										<div class="table-cell cell-status">状态</div>
										<div class="table-cell cell-time">提交时间</div>
										<div class="table-cell cell-actions">操作</div>
									`
		};

		tableHeader.innerHTML = headers[menu];

		await loadData();
		
		// 如果是推荐管理菜单，加载额外的统计数据
		if (menu === 'recommendation') {
			await loadRecommendationMetrics();
		}
}

async function loadData() {
	showLoading();
	try {
		let method = 'GET';
		let data = null;

		// 端点到 API 映射（大部分菜单只需 endpoint）
			const endpointMap = {
				user: '/admin_users.php',
				content: `/admin_content.php?page=${currentPage}&limit=${currentLimit}`,
				stats: '/admin_stats.php',
				carousel: '/admin_carousels.php',
				version: '/get_versions.php',
				recommendation: '/admin_recommendations.php',
				user_profile: '/user_profile.php?action=profile',
				content_similarity: '/user_profile.php?action=content_similarity',
				article: '/simple_articles.php',
				feedback: `/admin_feedback.php?page=${currentPage}&limit=${currentLimit}`,
			};

			let endpoint = endpointMap[currentMenu] || '';

			// 需要额外处理参数的菜单
			if (currentMenu === 'logs') {
				const logTypeFilter = document.getElementById('logTypeFilter');
				const logUserIdFilter = document.getElementById('logUserIdFilter');
				const fType = logTypeFilter ? logTypeFilter.value : '';
				const fUserId = logUserIdFilter ? logUserIdFilter.value : '';
				let qs = `page=${currentPage}&limit=${currentLimit}`;
				if (fType) qs += `&type=${fType}`;
				if (fUserId) qs += `&user_id=${fUserId}`;
				endpoint = `/admin_logs.php?${qs}`;
					} else if (currentMenu === 'announcement') {
						endpoint = '/announcements.php';
						method = 'POST';
						data = { action: 'get_announcements' };
					}

					const response = await fetch(`${API_BASE_URL}${endpoint}`, {
			method: method,
			credentials: 'include',
			headers: data ? { 'Content-Type': 'application/json' } : {},
			body: data ? JSON.stringify(data) : null
		});


		// 尝试读取响应文本
		const responseText = await response.text();

		// 检查响应是否为空
		if (!responseText || responseText.trim() === '') {
			console.error('服务器返回空响应');
			showToast('服务器返回空响应，请稍后重试');
			// 为当前菜单设置默认数据，避免页面空白
			if (currentMenu === 'stats') {
				currentData = {};
			} else {
				currentData = [];
			}
			totalItems = 0;
			renderTable();
			return;
		}

		// 尝试解析JSON
		let result;
		try {
			result = JSON.parse(responseText);
		} catch (parseError) {
			console.error('JSON解析错误:', parseError);
			console.error('响应文本:', responseText);
			showToast('服务器返回的数据格式错误，请稍后重试');
			// 为当前菜单设置默认数据，避免页面空白
			if (currentMenu === 'stats') {
				currentData = {};
			} else {
				currentData = [];
			}
			totalItems = 0;
			renderTable();
			return;
		}

		if (result.code === 200) {
			// 根据菜单类型设置默认值
			if (currentMenu === 'stats') {
				currentData = result.data || {};
			} else {
				currentData = result.data || [];
			}
			totalItems = result.total || 0;
			renderTable();
			if (currentMenu === 'logs' || currentMenu === 'content' || currentMenu === 'feedback') {
				renderPagination();
			}
		} else {
			showToast(result.message || '加载数据失败');
		}
	} catch (error) {
		console.error('加载数据错误:', error);
		showToast('网络错误，请稍后重试');
	} finally {
		hideLoading();
	}
}

function renderPagination() {
	// 移除现有的分页控件
	const existingPagination = document.querySelector('.pagination');
	if (existingPagination) {
		existingPagination.remove();
	}
	
	// 计算总页数
	const totalPages = Math.ceil(totalItems / currentLimit);
	
	// 创建分页容器
	const pagination = document.createElement('div');
	pagination.className = 'pagination';
	pagination.style.marginTop = '20px';
	pagination.style.display = 'flex';
	pagination.style.justifyContent = 'center';
	pagination.style.alignItems = 'center';
	pagination.style.gap = '10px';
	
	// 添加分页信息
	const paginationInfo = document.createElement('div');
	paginationInfo.className = 'pagination-info';
	paginationInfo.style.fontSize = '14px';
	paginationInfo.style.color = '#666';
	paginationInfo.textContent = `共 ${totalItems} 条记录，第 ${currentPage} / ${totalPages} 页`;
	pagination.appendChild(paginationInfo);
	
	// 添加分页按钮
	const paginationButtons = document.createElement('div');
	paginationButtons.className = 'pagination-buttons';
	paginationButtons.style.display = 'flex';
	paginationButtons.style.gap = '5px';
	
	// 上一页按钮
	const prevButton = document.createElement('button');
	prevButton.className = 'btn btn-sm btn-secondary';
	prevButton.textContent = '上一页';
	prevButton.disabled = currentPage === 1;
	prevButton.addEventListener('click', () => {
		if (currentPage > 1) {
			currentPage--;
			loadData();
		}
	});
	paginationButtons.appendChild(prevButton);
	
	// 页码按钮
	const startPage = Math.max(1, currentPage - 2);
	const endPage = Math.min(totalPages, startPage + 4);
	
	for (let i = startPage; i <= endPage; i++) {
		const pageButton = document.createElement('button');
		pageButton.className = `btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-secondary'}`;
		pageButton.textContent = i;
		pageButton.addEventListener('click', () => {
			currentPage = i;
			loadData();
		});
		paginationButtons.appendChild(pageButton);
	}
	
	// 下一页按钮
	const nextButton = document.createElement('button');
	nextButton.className = 'btn btn-sm btn-secondary';
	nextButton.textContent = '下一页';
	nextButton.disabled = currentPage === totalPages;
	nextButton.addEventListener('click', () => {
		if (currentPage < totalPages) {
			currentPage++;
			loadData();
		}
	});
	paginationButtons.appendChild(nextButton);
	
	pagination.appendChild(paginationButtons);
	
	// 添加到内容体
	const contentBody = document.querySelector('.content-body');
	if (contentBody) {
		contentBody.appendChild(pagination);
	}
}

function renderTable() {
	let html = '';
	switch (currentMenu) {
		case 'user':
			html = currentData.map(item => `
			<div class="table-row">
			<div class="table-cell cell-id">${item.id}</div>
			<div class="table-cell cell-avatar">
			${item.avatar ? `<img src="${item.avatar}" alt="${item.username}" class="avatar-small">` : '<div class="avatar-placeholder">暂无</div>'}
			</div>
			<div class="table-cell cell-username">${item.username}</div>
			<div class="table-cell cell-nickname">${item.nickname || '-'}</div>
			<div class="table-cell cell-role">
			<span class="role-badge ${item.role === 'admin' ? 'role-admin' : 'role-user'}">
			${item.role === 'admin' ? '管理员' : '普通用户'}
			</span>
			</div>
			<div class="table-cell cell-time">${item.created_at ? item.created_at.split(' ')[0] : '-'}</div>
			<div class="table-cell cell-actions">
			<button class="btn btn-sm btn-edit" data-id="${item.id}">编辑</button>
			<button class="btn btn-sm btn-edit-avatar" data-id="${item.id}">修改头像</button>
			<button class="btn btn-sm btn-edit-bg" data-id="${item.id}">修改背景</button>
			<button class="btn btn-sm btn-delete" data-id="${item.id}">删除</button>
			</div>
			</div>
			`).join('');
			break;
		case 'content':
			html = currentData.map(item => `
			<div class="table-row">
			<div class="table-cell cell-id">${item.id}</div>
			<div class="table-cell cell-publisher">
			<div class="user-info">
			${item.avatar ? `<img src="${item.avatar}" alt="${item.username}" class="avatar-small">` : '<div class="avatar-placeholder">暂无</div>'}
			<div class="user-details">
			<div class="username">${item.username}</div>
			<div class="nickname">${item.nickname || '-'}</div>
			</div>
			</div>
			</div>
			<div class="table-cell cell-title">${item.title || '-'}</div>
			<div class="table-cell cell-image">
			${item.image_url ? `<img src="${item.image_url}" alt="${item.title}" class="content-thumb">` : '<div class="no-image">无图片</div>'}
			</div>
			<div class="table-cell cell-content">${item.content ? item.content.substring(0, 100) + (item.content.length > 100 ? '...' : '') : '-'}</div>
			<div class="table-cell cell-likes">${item.likes || 0}</div>
			<div class="table-cell cell-comments">${item.comments || 0}</div>
			<div class="table-cell cell-time">${item.created_at ? item.created_at.split(' ')[0] : '-'}</div>
			<div class="table-cell cell-actions">
			<button class="btn btn-sm btn-edit" data-id="${item.id}">编辑</button>
			<button class="btn btn-sm btn-delete" data-id="${item.id}">删除</button>
			</div>
			</div>
			`).join('');
			break;
		case 'message':
			html = currentData.map(item => `
			<div class="table-row">
			<div class="table-cell cell-id">${item.id}</div>
			<div class="table-cell cell-sender">
			<div class="user-info">
			${item.sender_avatar ? `<img src="${item.sender_avatar}" alt="${item.sender_username}" class="avatar-small">` : '<div class="avatar-placeholder">暂无</div>'}
			<div class="user-details">
			<div class="username">${item.sender_username}</div>
			<div class="nickname">${item.sender_nickname || '-'}</div>
			</div>
			</div>
			</div>
			<div class="table-cell cell-receiver">
			<div class="user-info">
			${item.receiver_avatar ? `<img src="${item.receiver_avatar}" alt="${item.receiver_username}" class="avatar-small">` : '<div class="avatar-placeholder">暂无</div>'}
			<div class="user-details">
			<div class="username">${item.receiver_username}</div>
			<div class="nickname">${item.receiver_nickname || '-'}</div>
			</div>
			</div>
			</div>
			<div class="table-cell cell-message-content">${item.content ? item.content.substring(0, 100) + (item.content.length > 100 ? '...' : '') : '-'}</div>
			<div class="table-cell cell-time">${item.created_at ? item.created_at : '-'}</div>
			<div class="table-cell cell-actions">
			<button class="btn btn-sm btn-delete" data-id="${item.id}">删除</button>
			</div>
			</div>
			`).join('');
			break;
		case 'stats':
			// 渲染数据统计页面
			if (currentData && typeof currentData === 'object') {
			html = `
			<div class="stats-container">
			<div class="stats-cards">
			<div class="stats-card">
			<div class="stats-card-title">用户总数</div>
			<div class="stats-card-value">${currentData.total_users || 0}</div>
			</div>
			<div class="stats-card">
			<div class="stats-card-title">今日新增用户</div>
			<div class="stats-card-value">${currentData.today_users || 0}</div>
			</div>
			<div class="stats-card">
			<div class="stats-card-title">关注关系总数</div>
			<div class="stats-card-value">${currentData.total_follows || 0}</div>
			</div>
			<div class="stats-card">
			<div class="stats-card-title">内容总数</div>
			<div class="stats-card-value">${currentData.total_content || 0}</div>
			</div>
			<div class="stats-card">
			<div class="stats-card-title">消息总数</div>
			<div class="stats-card-value">${currentData.total_messages || 0}</div>
			</div>
			</div>
			<div class="stats-charts">
			<div class="chart-section">
			<h3>近7天用户增长</h3>
			<div class="chart-container">
			<div class="user-growth-chart">
			${currentData.user_growth ? currentData.user_growth.map(item => `
			<div class="chart-bar" style="height: ${Math.max(item.count * 10, 20)}px;">
			<div class="chart-bar-label">${item.date.split('-')[2]}</div>
			<div class="chart-bar-value">${item.count}</div>
			</div>
			`).join('') : '<div class="no-data">暂无数据</div>'}
			</div>
			</div>
			</div>
			</div>
			</div>
			`;
			} else {
			html = `
			<div class="stats-container">
			<div class="stats-cards">
			<div class="stats-card">
			<div class="stats-card-title">用户总数</div>
			<div class="stats-card-value">0</div>
			</div>
			<div class="stats-card">
			<div class="stats-card-title">今日新增用户</div>
			<div class="stats-card-value">0</div>
			</div>
			<div class="stats-card">
			<div class="stats-card-title">关注关系总数</div>
			<div class="stats-card-value">0</div>
			</div>
			<div class="stats-card">
			<div class="stats-card-title">内容总数</div>
			<div class="stats-card-value">0</div>
			</div>
			<div class="stats-card">
			<div class="stats-card-title">消息总数</div>
			<div class="stats-card-value">0</div>
			</div>
			</div>
			<div class="stats-charts">
			<div class="chart-section">
			<h3>近7天用户增长</h3>
			<div class="chart-container">
			<div class="user-growth-chart">
			<div class="no-data">暂无数据</div>
			</div>
			</div>
			</div>
			</div>
			</div>
			`;
			}
			break;
		case 'logs':
			// 渲染系统日志页面
			html = currentData.map(item => `
			<div class="table-row">
			<div class="table-cell cell-id">${item.id}</div>
			<div class="table-cell cell-username">${item.username || '-'}</div>
			<div class="table-cell cell-type">${item.type || '-'}</div>
			<div class="table-cell cell-action">${item.action || '-'}</div>
			<div class="table-cell cell-message">${item.message || '-'}</div>
			<div class="table-cell cell-ip">${item.ip_address || '-'}</div>
			<div class="table-cell cell-time">${item.created_at || '-'}</div>
			</div>
			`).join('');
			break;
		case 'carousel':
			html = currentData.map(item => `
			<div class="table-row">
			<div class="table-cell cell-id">${item.id}</div>
			<div class="table-cell cell-title">${item.title}</div>
			<div class="table-cell cell-author">${item.author || '-'}</div>
			<div class="table-cell cell-image">
			<img class="carousel-thumb" src="${item.image_url}" alt="${item.title}">
			</div>
			<div class="table-cell cell-sort">${item.sort_order}</div>
			<div class="table-cell cell-actions">
			<button class="btn btn-sm btn-edit" data-id="${item.id}">编辑</button>
			<button class="btn btn-sm btn-delete" data-id="${item.id}">删除</button>
			</div>
			</div>
			`).join('');
			break;
		case 'version':
			html = currentData.map(item => `
			<div class="table-row">
			<div class="table-cell cell-id">${item.id}</div>
			<div class="table-cell cell-version">v${item.version}</div>
			<div class="table-cell cell-desc">${item.description || '-'}</div>
			<div class="table-cell cell-date">${item.createTime}</div>
			<div class="table-cell cell-actions">
			<a href="${item.downloadUrl}" class="btn btn-sm btn-download" download>下载</a>
			<button class="btn btn-sm btn-delete" data-id="${item.id}">删除</button>
			</div>
			</div>
			`).join('');
			break;
		case 'announcement':
			html = currentData.map(item => `
			<div class="table-row">
			<div class="table-cell cell-id">${item.id}</div>
			<div class="table-cell cell-title">${item.title}</div>
			<div class="table-cell cell-content">${item.content.substring(0, 50)}${item.content.length > 50 ? '...' : ''}</div>
			<div class="table-cell cell-date">${item.created_at ? item.created_at.split(' ')[0] : '-'}</div>
			<div class="table-cell cell-actions">
			<button class="btn btn-sm btn-delete" data-id="${item.id}">删除</button>
			</div>
			</div>
			`).join('');
			break;
		case 'recommendation':
			html = currentData.map(item => `
			<div class="table-row">
			<div class="table-cell cell-id">${item.id || '-'}</div>
			<div class="table-cell cell-type">${item.algorithm_name || item.algorithm || '-'}</div>
			<div class="table-cell cell-shows">${item.shows || 0}</div>
			<div class="table-cell cell-clicks">${item.clicks || 0}</div>
			<div class="table-cell cell-ctr">${(item.ctr * 100).toFixed(2)}%</div>
			<div class="table-cell cell-status">
			<span class="status-badge ${item.enabled ? 'status-active' : 'status-inactive'}">
			${item.enabled ? '启用' : '禁用'}
			</span>
			</div>
			<div class="table-cell cell-actions">
			<button class="btn btn-sm btn-edit" data-id="${item.id}">编辑</button>
			<button class="btn btn-sm btn-delete" data-id="${item.id}">删除</button>
			</div>
			</div>
			`).join('');
			break;
		case 'user_profile':
			// 渲染用户画像分析页面
			if (Array.isArray(currentData)) {
			// 当返回的是用户列表时，显示表格
			html = `
			<div class="user-profile-list-container">
			<div class="table-body">
			${currentData.map(user => `
			<div class="table-row">
			<div class="table-cell cell-id">${user.user_id}</div>
			<div class="table-cell cell-username">${user.basic_info?.username || '未知用户'}</div>
			<div class="table-cell cell-nickname">${user.basic_info?.nickname || '无'}</div>
			<div class="table-cell cell-behaviors">${user.behavior_stats ? user.behavior_stats.total_behaviors || 0 : 0}</div>
			<div class="table-cell cell-tags">
			${user.preferred_tags && user.preferred_tags.length > 0 ?
			user.preferred_tags.slice(0, 3).map(tag => `<span class="tag-item">${tag.tag || tag.score || tag}</span>`).join(' ') :
			'无'
			}
			</div>
			<div class="table-cell cell-time">${user.basic_info?.created_at || '未知'}</div>
			<div class="table-cell cell-actions">
			<button class="btn btn-sm btn-edit" data-id="${user.user_id}">查看详情</button>
			</div>
			</div>
			`).join('')}
			</div>
			</div>
			`;
			} else if (currentData.basic_info) {
			// 当返回的是单个用户画像时，显示详细信息
			html = `
			<div class="user-profile-container">
			<div class="profile-section">
			<h3>用户基本信息</h3>
			<div class="profile-info">
			<div class="info-item">
			<span class="info-label">用户ID:</span>
			<span class="info-value">${currentData.user_id}</span>
			</div>
			<div class="info-item">
			<span class="info-label">用户名:</span>
			<span class="info-value">${currentData.basic_info?.username || '未知用户'}</span>
			</div>
			<div class="info-item">
			<span class="info-label">昵称:</span>
			<span class="info-value">${currentData.basic_info?.nickname || '无'}</span>
			</div>
			<div class="info-item">
			<span class="info-label">注册时间:</span>
			<span class="info-value">${currentData.basic_info?.created_at || '未知'}</span>
			</div>
			</div>
			</div>
			<div class="profile-section">
			<h3>行为统计</h3>
			<div class="behavior-stats">
			<div class="stats-item">
			<span class="stats-label">总行为次数:</span>
			<span class="stats-value">${currentData.behavior_stats ? currentData.behavior_stats.total_behaviors || 0 : 0}</span>
			</div>
			<div class="stats-item">
			<span class="stats-label">行为类型:</span>
			<span class="stats-value">${currentData.behavior_stats ? currentData.behavior_stats.behavior_types.length || 0 : 0}种</span>
			</div>
			</div>
			</div>
			<div class="profile-section">
			<h3>偏好标签</h3>
			<div class="preferred-tags">
			${currentData.preferred_tags && currentData.preferred_tags.length > 0 ?
			currentData.preferred_tags.map(tag => `
			<div class="tag-item">
			<span class="tag-name">${tag.tag}</span>
			<span class="tag-count">${tag.count}次</span>
			</div>
			`).join('') :
			'<div class="no-data">暂无偏好标签</div>'
			}
			</div>
			</div>
			<div class="profile-section">
			<h3>偏好内容</h3>
			<div class="preferred-content">
			${currentData.preferred_content && currentData.preferred_content.length > 0 ?
			currentData.preferred_content.map(item => `
			<div class="content-item">
			<div class="content-info">
			<h4>${item.content_info && item.content_info.title ? item.content_info.title : item.title || '未知内容'}</h4>
			<p>交互次数: ${item.interaction_count}次</p>
			</div>
			</div>
			`).join('') :
			'<div class="no-data">暂无偏好内容</div>'
			}
			</div>
			</div>
			</div>
			`;
			} else {
			html = '<div class="no-data">暂无用户画像数据</div>';
			}
			break;
		case 'content_similarity':
			// 渲染内容相似度分析页面
			if (currentData.recommendations && currentData.recommendations.length > 0) {
			html = `
			<div class="content-similarity-container">
			<div class="similarity-section">
			<div class="table-body">
			${currentData.recommendations.map((content, index) => `
			<div class="table-row">
			<div class="table-cell cell-id">${content.id}</div>
			<div class="table-cell cell-content1">
			<div class="content-info">
			<h4>${content.title || '无标题'}</h4>
			<p>作者: ${content.username || '未知用户'}</p>
			</div>
			</div>
			<div class="table-cell cell-image">
			${content.image_url ? `<img src="${content.image_url}" alt="内容图片" class="content-thumb">` : '<div class="no-image">无图片</div>'}
			</div>
			<div class="table-cell cell-similarity">${(content.similarity || 0).toFixed(4)}</div>
			<div class="table-cell cell-tag-similarity">${(content.tag_similarity || 0).toFixed(4)}</div>
			<div class="table-cell cell-category-similarity">${(content.category_similarity || 0).toFixed(4)}</div>
			<div class="table-cell cell-actions">
			<button class="btn btn-sm btn-edit" data-id="${content.id}">查看详情</button>
			</div>
			</div>
			`).join('')}
			</div>
			</div>
			</div>
			`;
			} else {
			html = '<div class="no-data">暂无内容相似度数据</div>';
			}
			break;
		case 'article':
			// 渲染文章管理页面
			html = currentData.map(item => `
			<div class="table-row">
			<div class="table-cell cell-id">${item.id}</div>
			<div class="table-cell cell-title">${item.title || '-'}</div>
			<div class="table-cell cell-author">${item.author || item.username || '未知'}</div>
			<div class="table-cell cell-date">${item.date ? item.date.split(' ')[0] : item.created_at ? item.created_at.split(' ')[0] : '-'}</div>
			<div class="table-cell cell-status">
			<span class="status-badge ${item.status === 'published' ? 'status-active' : 'status-inactive'}">
			${item.status === 'published' ? '已发布' : '草稿'}
			</span>
			</div>
			<div class="table-cell cell-actions">
			<button class="btn btn-sm btn-edit" data-id="${item.id}">编辑</button>
			<button class="btn btn-sm btn-top" data-id="${item.id}">置顶</button>
			<button class="btn btn-sm btn-recommend" data-id="${item.id}">推荐</button>
			<button class="btn btn-sm btn-delete" data-id="${item.id}">删除</button>
			</div>
			</div>
			`).join('');
			if (html === '') {
			html = '<div class="no-data">暂无文章数据</div>';
			}
			break;
		case 'feedback':
			const statusMap = { 0: '未读', 1: '已读', 2: '已处理' };
			const statusClass = { 0: 'status-inactive', 1: '', 2: 'status-active' };
			html = currentData.map(item => `
			<div class="table-row">
			<div class="table-cell cell-id">${item.id}</div>
			<div class="table-cell cell-username">
			<div class="user-info">
			${item.avatar ? `<img src="${item.avatar}" alt="${item.username}" class="avatar-small">` : '<div class="avatar-placeholder">暂无</div>'}
			<div class="user-details">
			<div class="username">${item.nickname || item.username || '未知'}</div>
			<div class="nickname">ID: ${item.user_id}</div>
			</div>
			</div>
			</div>
			<div class="table-cell cell-type">${item.type}</div>
			<div class="table-cell cell-content">${item.content ? item.content.substring(0, 80) + (item.content.length > 80 ? '...' : '') : '-'}</div>
			<div class="table-cell cell-contact">${item.contact || '-'}</div>
			<div class="table-cell cell-status">
			<span class="status-badge ${statusClass[item.status] || 'status-inactive'}">
			${statusMap[item.status] || '未知'}
			</span>
			</div>
			<div class="table-cell cell-time">${item.created_at ? item.created_at.substring(0, 16) : '-'}</div>
			<div class="table-cell cell-actions">
			${item.status == 0 ? '<button class="btn btn-sm btn-read" data-id="' + item.id + '">标记已读</button>' : ''}
			${item.status != 2 ? '<button class="btn btn-sm btn-process" data-id="' + item.id + '">标记已处理</button>' : ''}
			<button class="btn btn-sm btn-delete" data-id="${item.id}">删除</button>
			</div>
			</div>
			`).join('');
			if (html === '') {
			html = '<div class="no-data">暂无反馈数据</div>';
		}
		break;
	}

	tableBody.innerHTML = html;
	bindTableEvents();

}

function bindTableEvents() {
	const editButtons = document.querySelectorAll('.btn-edit');
	const editAvatarButtons = document.querySelectorAll('.btn-edit-avatar');
	const editBgButtons = document.querySelectorAll('.btn-edit-bg');
	const deleteButtons = document.querySelectorAll('.btn-delete');
	const topButtons = document.querySelectorAll('.btn-top');
	const recommendButtons = document.querySelectorAll('.btn-recommend');
	const readButtons = document.querySelectorAll('.btn-read');
	const processButtons = document.querySelectorAll('.btn-process');


	editButtons.forEach((btn, index) => {
		btn.addEventListener('click', (e) => {
			const id = parseInt(e.target.dataset.id);
			if (currentMenu === 'user_profile') {
				// 用户画像页面的编辑按钮（查看详情）
				handleUserProfileDetail(id);
			} else if (currentMenu === 'content_similarity') {
				// 内容相似度分析页面的编辑按钮（查看详情）
				handleContentSimilarityDetail(id);
			} else {
				// 其他页面的编辑按钮
				handleEdit(id);
			}
		});
	});

	editAvatarButtons.forEach((btn, index) => {
		btn.addEventListener('click', (e) => {
			const id = parseInt(e.target.dataset.id);
			handleEditAvatar(id);
		});
	});

	editBgButtons.forEach((btn, index) => {
		btn.addEventListener('click', (e) => {
			const id = parseInt(e.target.dataset.id);
			handleEditBg(id);
		});
	});

	deleteButtons.forEach((btn, index) => {
		btn.addEventListener('click', (e) => {
			const id = parseInt(e.target.dataset.id);
			handleDelete(id);
		});
	});

	topButtons.forEach((btn, index) => {
		btn.addEventListener('click', (e) => {
			const id = parseInt(e.target.dataset.id);
			handleTop(id);
		});
	});

	recommendButtons.forEach((btn, index) => {
		btn.addEventListener('click', (e) => {
			const id = parseInt(e.target.dataset.id);
			handleRecommend(id);
		});
	});

	readButtons.forEach((btn, index) => {
		btn.addEventListener('click', (e) => {
			const id = parseInt(e.target.dataset.id);
			handleFeedbackStatus(id, 1);
		});
	});

	processButtons.forEach((btn, index) => {
		btn.addEventListener('click', (e) => {
			const id = parseInt(e.target.dataset.id);
			handleFeedbackStatus(id, 2);
		});
	});
}

function handleAdd() {
	editingItem = null;
	modalTitle.textContent = '添加项目';
	showModal();
}

function handleEdit(id) {

	// 检查currentData是否为数组
	if (!Array.isArray(currentData)) {
		return;
	}

	if (currentData.length === 0) {
		return;
	}

	const item = currentData.find(d => {
		return d.id == id;
	});

	if (!item) {
		return;
	}

	editingItem = item;
	
	if (currentMenu === 'content') {
		showContentDetail(item);
	} else {
		modalTitle.textContent = '编辑用户';
		showModal();
	}
}

/**
 * 显示内容详情
 * @param {Object} content 内容对象
 */
function showContentDetail(content) {
	modalTitle.textContent = '内容详情';
	modalBody.innerHTML = `
		<div class="content-detail">
			<div class="detail-section">
				<h3>内容基本信息</h3>
				<div class="detail-info">
					<div class="info-item">
						<span class="info-label">内容ID:</span>
						<span class="info-value">${content.id}</span>
					</div>
					<div class="info-item">
						<span class="info-label">标题:</span>
						<span class="info-value">${content.title || '无标题'}</span>
					</div>
					<div class="info-item">
						<span class="info-label">作者:</span>
						<span class="info-value">${content.username || '未知用户'}</span>
					</div>
					<div class="info-item">
						<span class="info-label">发布时间:</span>
						<span class="info-value">${content.created_at || '未知'}</span>
					</div>
				</div>
			</div>
			
			<div class="detail-section">
				<h3>内容媒体</h3>
				<div class="content-media">
					${content.image_url ? `<img src="${content.image_url}" alt="内容图片" class="content-detail-image">` : '<div class="no-image">无图片</div>'}
				</div>
			</div>
			
			<div class="detail-section">
				<h3>内容数据</h3>
				<div class="content-stats">
					<div class="stats-item">
						<span class="stats-label">点赞数:</span>
						<span class="stats-value">${content.likes || 0}</span>
					</div>
					<div class="stats-item">
						<span class="stats-label">评论数:</span>
						<span class="stats-value">${content.comments || 0}</span>
					</div>
				</div>
			</div>
			
			<div class="detail-section">
				<h3>内容详情</h3>
				<div class="content-description">
					${content.content ? content.content : '<p>暂无内容详情</p>'}
				</div>
			</div>
			
			<div class="detail-section">
				<h3>操作</h3>
				<button class="btn btn-primary" onclick="editContent(${content.id})">修改内容</button>
			</div>
		</div>
	`;
	modal.classList.add('show');
}

function handleEditAvatar(id) {

	// 检查currentData是否为数组
	if (!Array.isArray(currentData)) {
		return;
	}

	if (currentData.length === 0) {
		return;
	}

	const item = currentData.find(d => d.id == id);

	if (!item) {
		return;
	}

	editingItem = item;
	modalTitle.textContent = '修改头像';
	showAvatarModal();
}

function handleEditBg(id) {

	// 检查currentData是否为数组
	if (!Array.isArray(currentData)) {
		return;
	}

	if (currentData.length === 0) {
		return;
	}

	const item = currentData.find(d => d.id == id);

	if (!item) {
		return;
	}

	editingItem = item;
	modalTitle.textContent = '修改背景图片';
	showBgModal();
}

function handleTop(id) {
	showLoading();
	fetch(`${API_BASE_URL}/admin_articles.php`, {
		method: 'PUT',
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			id: id,
			top: 1
		})
	})
	.then(response => response.json())
	.then(result => {
		if (result.code === 200) {
			showToast('置顶成功', 'success');
			loadData();
		} else {
			showToast('置顶失败: ' + result.message);
		}
	})
	.catch(error => {
		console.error('置顶文章错误:', error);
		showToast('网络错误，请稍后重试');
	})
	.finally(() => {
		hideLoading();
	});
}

function handleRecommend(id) {
	showLoading();
	fetch(`${API_BASE_URL}/admin_articles.php`, {
		method: 'PUT',
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			id: id,
			recommend: 1
		})
	})
	.then(response => response.json())
	.then(result => {
		if (result.code === 200) {
			showToast('推荐成功', 'success');
			loadData();
		} else {
			showToast('推荐失败: ' + result.message);
		}
	})
	.catch(error => {
		console.error('推荐文章错误:', error);
		showToast('网络错误，请稍后重试');
	})
	.finally(() => {
		hideLoading();
	});
}

/**
 * 编辑内容
 * @param {number} contentId 内容ID
 */
function editContent(contentId) {
	const item = currentData.find(d => d.id == contentId);
	if (!item) {
		showToast('未找到对应内容');
		return;
	}

	editingItem = item;
	modalTitle.textContent = '修改内容';
	modalBody.innerHTML = `
		<div class="form-group">
			<label>标题</label>
			<input type="text" id="formTitle" value="${item.title || ''}" placeholder="请输入标题">
		</div>
		<div class="form-group">
			<label>内容</label>
			<textarea id="formContent" rows="5" placeholder="请输入内容">${item.content || ''}</textarea>
		</div>
		<div class="form-group">
			<label>图片</label>
			<input type="file" id="formImage" accept="image/*">
			${item.image_url ? `<div class="image-preview"><img src="${item.image_url}" alt="当前图片" style="max-width: 200px; max-height: 100px; margin-top: 10px;"></div>` : ''}
		</div>
	`;
	modal.classList.add('show');
}

/**
 * 处理内容修改提交
 */
async function handleContentUpdate() {
	const title = document.getElementById('formTitle').value;
	const content = document.getElementById('formContent').value;
	const imageFile = document.getElementById('formImage').files[0];

	if (!title) {
		showToast('请输入标题');
		return;
	}

	showLoading();
	try {
		let imageUrl = editingItem.image_url;

		// 如果有新图片上传
		if (imageFile) {
			const formData = new FormData();
			formData.append('image', imageFile);
			formData.append('content_id', editingItem.id);

			const uploadResponse = await fetch(`${API_BASE_URL}/admin_content.php?action=upload_image`, {
				method: 'POST',
				credentials: 'include',
				body: formData
			});

			// 尝试读取响应文本
			const uploadResponseText = await uploadResponse.text();

			// 检查响应是否为空
			if (!uploadResponseText || uploadResponseText.trim() === '') {
				console.error('服务器返回空响应');
				showToast('图片上传失败：服务器返回空响应');
				return;
			}

			// 尝试解析JSON
			let uploadResult;
			try {
				uploadResult = JSON.parse(uploadResponseText);
			} catch (parseError) {
				console.error('JSON解析错误:', parseError);
				showToast('图片上传失败：数据格式错误');
				return;
			}

			if (uploadResult.code === 200) {
				imageUrl = uploadResult.data.image_url;
			} else {
				showToast('图片上传失败: ' + uploadResult.message);
				return;
			}
		}

		// 更新内容
		const updateResponse = await fetch(`${API_BASE_URL}/admin_content.php`, {
			method: 'PUT',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				id: editingItem.id,
				title: title,
				content: content,
				image_url: imageUrl
			})
		});

		// 尝试读取响应文本
		const updateResponseText = await updateResponse.text();

		// 检查响应是否为空
		if (!updateResponseText || updateResponseText.trim() === '') {
			console.error('服务器返回空响应');
			showToast('修改失败：服务器返回空响应');
			return;
		}

		// 尝试解析JSON
		let updateResult;
		try {
			updateResult = JSON.parse(updateResponseText);
		} catch (parseError) {
			console.error('JSON解析错误:', parseError);
			showToast('修改失败：数据格式错误');
			return;
		}

		if (updateResult.code === 200) {
			showToast('修改成功', 'success');
			closeModal();
			await loadData();
		} else {
			showToast('修改失败: ' + updateResult.message);
		}
	} catch (error) {
		console.error('修改内容错误:', error);
		showToast('网络错误，请稍后重试');
	} finally {
		hideLoading();
	}
}

/**
 * 处理用户画像详情查看
 * @param {number} userId 用户ID
 */
async function handleUserProfileDetail(userId) {
	showLoading();
	try {
		const endpoint = `/user_profile.php?action=profile&user_id=${userId}`;
		const response = await fetch(`${API_BASE_URL}${endpoint}`, {
			method: 'GET',
			credentials: 'include'
		});

		// 尝试读取响应文本
		const responseText = await response.text();

		// 检查响应是否为空
		if (!responseText || responseText.trim() === '') {
			console.error('服务器返回空响应');
			showToast('获取用户画像失败：服务器返回空响应');
			currentData = {};
			renderTable();
			return;
		}

		// 尝试解析JSON
		let result;
		try {
			result = JSON.parse(responseText);
		} catch (parseError) {
			console.error('JSON解析错误:', parseError);
			showToast('获取用户画像失败：数据格式错误');
			currentData = {};
			renderTable();
			return;
		}


		if (result.code === 200) {
			currentData = result.data;
			renderTable();
		} else {
			showToast(result.message || '获取用户画像失败');
			currentData = {};
			renderTable();
		}
	} catch (error) {
		console.error('获取用户画像错误:', error);
		showToast('网络错误，请稍后重试');
		currentData = {};
		renderTable();
	} finally {
		hideLoading();
	}
}

/**
 * 处理内容相似度详情查看
 * @param {number} contentId 内容ID
 */
async function handleContentSimilarityDetail(contentId) {
	showLoading();
	try {
		// 从当前数据中查找对应ID的内容
		if (currentData.recommendations && Array.isArray(currentData.recommendations)) {
			const content = currentData.recommendations.find(item => item.id == contentId);
			if (content) {
				// 显示内容相似度详情
				modalTitle.textContent = '内容相似度详情';
				modalBody.innerHTML = `
					<div class="content-similarity-detail">
						<div class="detail-section">
							<h3>内容基本信息</h3>
							<div class="detail-info">
								<div class="info-item">
									<span class="info-label">内容ID:</span>
									<span class="info-value">${content.id}</span>
								</div>
								<div class="info-item">
									<span class="info-label">标题:</span>
									<span class="info-value">${content.title || '无标题'}</span>
								</div>
								<div class="info-item">
									<span class="info-label">作者:</span>
									<span class="info-value">${content.username || '未知用户'}</span>
								</div>
								<div class="info-item">
									<span class="info-label">发布时间:</span>
									<span class="info-value">${content.created_at || '未知'}</span>
								</div>
							</div>
						</div>
						
						<div class="detail-section">
							<h3>内容媒体</h3>
							<div class="content-media">
								${content.image_url ? `<img src="${content.image_url}" alt="内容图片" class="content-detail-image">` : '<div class="no-image">无图片</div>'}
								${content.video_url ? `<p class="video-url">视频链接: <a href="${content.video_url}" target="_blank">${content.video_url}</a></p>` : ''}
							</div>
						</div>
						
						<div class="detail-section">
							<h3>内容数据</h3>
							<div class="content-stats">
								<div class="stats-item">
									<span class="stats-label">点赞数:</span>
									<span class="stats-value">${content.likes || 0}</span>
								</div>
								<div class="stats-item">
									<span class="stats-label">评论数:</span>
									<span class="stats-value">${content.comments || 0}</span>
								</div>
							</div>
						</div>
						
						<div class="detail-section">
							<h3>相似度分析</h3>
							<div class="similarity-stats">
								<div class="stats-item">
									<span class="stats-label">综合相似度:</span>
									<span class="stats-value">${(content.similarity || 0).toFixed(4)}</span>
								</div>
								<div class="stats-item">
									<span class="stats-label">标签相似度:</span>
									<span class="stats-value">${(content.tag_similarity || 0).toFixed(4)}</span>
								</div>
								<div class="stats-item">
									<span class="stats-label">分类相似度:</span>
									<span class="stats-value">${(content.category_similarity || 0).toFixed(4)}</span>
								</div>
							</div>
						</div>
						
						<div class="detail-section">
							<h3>内容详情</h3>
							<div class="content-description">
								${content.content ? content.content : '<p>暂无内容详情</p>'}
							</div>
						</div>
					</div>
				`;
				modal.classList.add('show');
			} else {
				showToast('未找到对应内容');
			}
		} else {
			showToast('数据加载失败，请刷新页面重试');
		}
	} catch (error) {
		console.error('获取内容相似度详情错误:', error);
		showToast('网络错误，请稍后重试');
	} finally {
		hideLoading();
	}
}

async function handleDelete(id) {
	if (!confirm('确定要删除该项目吗？')) return;
	
	try {
		let endpoint = '';
		let method = 'DELETE';
		let data = null;
		
		
		switch (currentMenu) {
			case 'user':
				endpoint = `/admin_users.php?id=${id}`;
				break;
			case 'content':
				endpoint = `/admin_content.php?id=${id}`;
				break;
			
			case 'carousel':
				endpoint = `/admin_carousels.php?id=${id}`;
				break;
			case 'version':
				endpoint = `/delete_version.php`;
				method = 'POST';
				data = { id: id };
				break;
			case 'announcement':
				endpoint = `/announcements.php`;
				method = 'POST';
				data = { action: 'delete_announcement', id: id };
				break;
			case 'recommendation':
							endpoint = `/admin_recommendations.php?id=${id}`;
							method = 'DELETE';
							break;
					case 'article':
							endpoint = `/admin_articles.php?id=${id}`;
							method = 'DELETE';
							break;
					case 'feedback':
							endpoint = `/admin_feedback.php?id=${id}`;
							method = 'DELETE';
							break;
		}
		

		const response = await fetch(`${API_BASE_URL}${endpoint}`, {
			method: method,
			headers: data ? { 'Content-Type': 'application/json' } : {},
			credentials: 'include',
			body: data ? JSON.stringify(data) : null
		});

		const result = await response.json();

		if (result.code === 200) {
			showToast('删除成功', 'success');
			await loadData();
		} else {
			showToast(result.message || '删除失败');
		}
	} catch (error) {
		console.error('删除错误:', error);
		showToast('网络错误，请稍后重试');
	}
}

/**
 * Update feedback status
 */
async function handleFeedbackStatus(id, status) {
	showLoading();
	try {
		const response = await fetch(`${API_BASE_URL}/admin_feedback.php`, {
			method: 'PUT',
			credentials: 'include',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify({id, status})
		});
		const result = await response.json();
		if (result.code === 200) {
			showToast(result.message, 'success');
			loadData();
		} else {
			showToast(result.message || '操作失败');
		}
	} catch (error) {
		showToast('网络错误');
	} finally {
		hideLoading();
	}
}
function showModal() {
	let formHtml = '';

	if (currentMenu === 'video') {
		formHtml = `
			<div class="form-group">
				<label>标题</label>
				<input type="text" id="formTitle" value="${editingItem ? editingItem.title : ''}">
			</div>
			<div class="form-group">
				<label>描述</label>
				<textarea id="formDescription" rows="3">${editingItem ? editingItem.description || '' : ''}</textarea>
			</div>
			<div class="form-group">
				<label>视频URL</label>
				<input type="text" id="formVideoUrl" value="${editingItem ? editingItem.video_url : ''}">
			</div>
			<div class="form-group">
				<label>封面URL</label>
				<input type="text" id="formCoverUrl" value="${editingItem ? editingItem.cover_url || '' : ''}">
			</div>
		`;
	} else if (currentMenu === 'user') {
		formHtml = `
			<div class="form-group">
				<label>用户名</label>
				<input type="text" id="formUsername" value="${editingItem ? editingItem.username : ''}" ${editingItem ? 'readonly' : ''}>
			</div>
			<div class="form-group">
				<label>昵称</label>
				<input type="text" id="formNickname" value="${editingItem ? editingItem.nickname || '' : ''}">
			</div>
			<div class="form-group">
				<label>头像URL</label>
				<input type="text" id="formAvatar" value="${editingItem ? editingItem.avatar || '' : ''}" placeholder="请输入头像URL">
			</div>
			<div class="form-group">
				<label>背景图片URL</label>
				<input type="text" id="formBackgroundImage" value="${editingItem ? editingItem.background_image || '' : ''}" placeholder="请输入背景图片URL">
			</div>
			${!editingItem ? `
			<div class="form-group">
				<label>密码</label>
				<input type="password" id="formPassword" placeholder="请输入密码">
			</div>
			` : ''}
			<div class="form-group">
				<label>角色</label>
				<select id="formRole">
					<option value="admin" ${editingItem && editingItem.role === 'admin' ? 'selected' : ''}>管理员</option>
					<option value="user" ${editingItem && editingItem.role === 'user' ? 'selected' : ''}>普通用户</option>
				</select>
			</div>
		`;
	} else if (currentMenu === 'carousel') {
		formHtml = `
			<div class="form-group">
				<label>标题</label>
				<input type="text" id="formTitle" value="${editingItem ? editingItem.title : ''}">
			</div>
			<div class="form-group">
				<label>作者</label>
				<input type="text" id="formAuthor" value="${editingItem ? editingItem.author || '' : ''}">
			</div>
			<div class="form-group">
				<label>图片URL</label>
				<input type="text" id="formImageUrl" value="${editingItem ? editingItem.image_url : ''}">
			</div>
			<div class="form-group">
				<label>排序</label>
				<input type="number" id="formSortOrder" value="${editingItem ? editingItem.sort_order : ''}">
			</div>
			<div class="form-group">
				<label>状态</label>
				<select id="formIsActive">
					<option value="1" ${editingItem && editingItem.is_active == 1 ? 'selected' : ''}>启用</option>
					<option value="0" ${editingItem && editingItem.is_active == 0 ? 'selected' : ''}>禁用</option>
				</select>
			</div>
			`;
	} else if (currentMenu === 'version') {
		formHtml = `
			<div class="form-group">
				<label>版本号</label>
				<input type="text" id="formVersion" placeholder="例如：1.0.1" value="${editingItem ? editingItem.version : ''}">
			</div>
			<div class="form-group">
				<label>更新说明</label>
				<textarea id="formDescription" rows="3" placeholder="请输入更新说明">${editingItem ? editingItem.description || '' : ''}</textarea>
			</div>
			<div class="form-group">
				<label>APK文件</label>
				<input type="file" id="formApkFile" accept=".apk">
			</div>
			`;
	} else if (currentMenu === 'announcement') {
		formHtml = `
			<div class="form-group">
				<label>公告标题</label>
				<input type="text" id="formTitle" placeholder="请输入公告标题" value="${editingItem ? editingItem.title : ''}">
			</div>
			<div class="form-group">
				<label>公告内容</label>
				<textarea id="formContent" rows="5" placeholder="请输入公告内容">${editingItem ? editingItem.content : ''}</textarea>
			</div>
		`;
	} else if (currentMenu === 'recommendation') {
		formHtml = `
			<div class="form-group">
				<label>算法类型</label>
				<select id="formAlgorithm">
					<option value="collaborative_filtering" ${editingItem && editingItem.algorithm === 'collaborative_filtering' ? 'selected' : ''}>协同过滤</option>
					<option value="content_based" ${editingItem && editingItem.algorithm === 'content_based' ? 'selected' : ''}>基于内容</option>
					<option value="popularity" ${editingItem && editingItem.algorithm === 'popularity' ? 'selected' : ''}>基于流行度</option>
					<option value="hybrid" ${editingItem && editingItem.algorithm === 'hybrid' ? 'selected' : ''}>混合推荐</option>
				</select>
			</div>
			<div class="form-group">
				<label>状态</label>
				<select id="formEnabled">
					<option value="1" ${editingItem && editingItem.enabled ? 'selected' : ''}>启用</option>
					<option value="0" ${editingItem && !editingItem.enabled ? 'selected' : ''}>禁用</option>
				</select>
			</div>
			<div class="form-group">
				<label>权重</label>
				<input type="number" id="formWeight" step="0.1" min="0" max="1" value="${editingItem ? editingItem.weight || 0.5 : '0.5'}" placeholder="请输入权重">
			</div>
			<div class="form-group">
				<label>描述</label>
				<textarea id="formDescription" rows="3" placeholder="请输入算法描述">${editingItem ? editingItem.description || '' : ''}</textarea>
			</div>
		`;
	}

	modalBody.innerHTML = formHtml;
	modal.classList.add('show');
}

function showAvatarModal() {
	const formHtml = `
		<div class="form-group">
			<label>当前头像</label>
			<div class="avatar-preview">
				${editingItem && editingItem.avatar ? `<img src="${editingItem.avatar}" alt="当前头像" class="avatar-large">` : '<div class="avatar-placeholder-large">暂无头像</div>'}
			</div>
		</div>
		<div class="form-group">
			<label>新头像URL</label>
			<input type="text" id="formAvatarUrl" placeholder="请输入头像URL" value="${editingItem ? editingItem.avatar || '' : ''}">
		</div>
	`;
	modalBody.innerHTML = formHtml;
	modal.classList.add('show');
}

function showBgModal() {
	const formHtml = `
		<div class="form-group">
			<label>当前背景图片</label>
			<div class="bg-preview">
				${editingItem && editingItem.background_image ? `<img src="${editingItem.background_image}" alt="当前背景" class="bg-large">` : '<div class="bg-placeholder-large">暂无背景图片</div>'}
			</div>
		</div>
		<div class="form-group">
			<label>新背景图片URL</label>
			<input type="text" id="formBgUrl" placeholder="请输入背景图片URL" value="${editingItem ? editingItem.background_image || '' : ''}">
		</div>
	`;
	modalBody.innerHTML = formHtml;
	modal.classList.add('show');
}

function closeModal() {
	modal.classList.remove('show');
	editingItem = null;
	
	// 移除大模态框样式
	const modalContent = document.querySelector('.modal-content');
	if (modalContent) {
		modalContent.classList.remove('large');
	}
}



async function handleLogout() {
	if (!confirm('确定要退出登录吗？')) return;

	try {
		const response = await fetch(`${API_BASE_URL}/admin_logout.php`, {
			method: 'POST',
			credentials: 'include'
		});

		// 无论响应如何，都执行登出操作
		localStorage.removeItem('adminInfo');
		window.location.href = 'login.html';
	} catch (error) {
		console.error('登出错误:', error);
		// 即使网络错误，也执行登出操作
		localStorage.removeItem('adminInfo');
		window.location.href = 'login.html';
	}
}

// 加载推荐系统统计数据
async function loadRecommendationMetrics() {
	showLoading();
	try {
		const response = await fetch(`${API_BASE_URL}/admin_recommendations.php?action=metrics`, {
			method: 'GET',
			credentials: 'include'
		});

		// 尝试读取响应文本
		const responseText = await response.text();

		// 检查响应是否为空
		if (!responseText || responseText.trim() === '') {
			console.error('服务器返回空响应');
			showToast('服务器返回空响应，请稍后重试');
			// 只使用真实数据，不设置默认值
			recommendationMetrics = {
				totalRecommendations: 0,
				averageCtr: 0,
				cacheHitRate: 0,
				processingTime: 0,
				algorithmPerformance: {}
			};
			// 显示统计卡片
			showRecommendationMetrics();
			return;
		}

		// 尝试解析JSON
		let result;
		try {
			result = JSON.parse(responseText);
		} catch (parseError) {
				console.error('JSON解析错误:', parseError);
				showToast('服务器返回的数据格式错误，请稍后重试');
				// 只使用真实数据，不设置默认值
				recommendationMetrics = {
					totalRecommendations: 0,
					averageCtr: 0,
					cacheHitRate: 0,
					processingTime: 0,
					algorithmPerformance: {}
				};
				// 显示统计卡片
				showRecommendationMetrics();
				return;
			}

		if (result.code === 200) {
			recommendationMetrics = result.data || {};
			// 只使用真实数据，不设置默认值
			if (!recommendationMetrics.cacheHitRate) {
				recommendationMetrics.cacheHitRate = 0;
			}
			if (!recommendationMetrics.processingTime) {
				recommendationMetrics.processingTime = 0;
			}
			if (!recommendationMetrics.averageCtr) {
				recommendationMetrics.averageCtr = 0;
			}
			if (!recommendationMetrics.totalRecommendations) {
				recommendationMetrics.totalRecommendations = 0;
			}
			if (!recommendationMetrics.algorithmPerformance) {
				recommendationMetrics.algorithmPerformance = {};
			}
			// 显示统计卡片
			showRecommendationMetrics();
		}
	} catch (error) {
		console.error('加载推荐统计数据失败:', error);
		showToast('加载推荐统计数据失败，请稍后重试');
		// 只使用真实数据，不设置默认值
		recommendationMetrics = {
			totalRecommendations: 0,
			averageCtr: 0,
			cacheHitRate: 0,
			processingTime: 0,
			algorithmPerformance: {}
		};
		showRecommendationMetrics();
	} finally {
		hideLoading();
	}
}

// 显示推荐系统统计卡片
function showRecommendationMetrics() {
	const contentBody = document.querySelector('.content-body');
	if (!contentBody) return;
	
	// 创建统计卡片容器
	const metricsContainer = document.createElement('div');
	metricsContainer.className = 'recommendation-metrics';
	metricsContainer.style.marginBottom = '20px';
	metricsContainer.style.padding = '20px';
	metricsContainer.style.backgroundColor = '#f8f9fa';
	metricsContainer.style.borderRadius = '8px';
	metricsContainer.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
	
	// 添加标题
	const metricsTitle = document.createElement('h3');
	metricsTitle.textContent = '推荐系统性能指标';
	metricsTitle.style.marginBottom = '15px';
	metricsTitle.style.color = '#333';
	metricsContainer.appendChild(metricsTitle);
	
	// 创建指标网格
	const metricsGrid = document.createElement('div');
	metricsGrid.style.display = 'grid';
	metricsGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
	metricsGrid.style.gap = '15px';
	
	// 添加指标卡片
	const metrics = [
		{
			label: '总推荐次数',
			value: recommendationMetrics.totalRecommendations || 0,
			unit: '',
			color: '#007bff'
		},
		{
			label: '平均点击率',
			value: ((recommendationMetrics.averageCtr || 0) * 100).toFixed(1),
			unit: '%',
			color: '#28a745'
		},
		{
			label: '缓存命中率',
			value: ((recommendationMetrics.cacheHitRate || 0) * 100).toFixed(1),
			unit: '%',
			color: '#ffc107'
		},
		{
			label: '平均处理时间',
			value: recommendationMetrics.processingTime || 0,
			unit: 'ms',
			color: '#dc3545'
		}
	];
	
	metrics.forEach(metric => {
		const metricCard = document.createElement('div');
		metricCard.style.backgroundColor = '#fff';
		metricCard.style.padding = '15px';
		metricCard.style.borderRadius = '6px';
		metricCard.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
		metricCard.style.textAlign = 'center';
		
		const metricLabel = document.createElement('div');
		metricLabel.textContent = metric.label;
		metricLabel.style.fontSize = '14px';
		metricLabel.style.color = '#666';
		metricLabel.style.marginBottom = '5px';
		
		const metricValue = document.createElement('div');
		metricValue.textContent = metric.value + metric.unit;
		metricValue.style.fontSize = '20px';
		metricValue.style.fontWeight = 'bold';
		metricValue.style.color = metric.color;
		
		metricCard.appendChild(metricLabel);
		metricCard.appendChild(metricValue);
		metricsGrid.appendChild(metricCard);
	});
	
	metricsContainer.appendChild(metricsGrid);
	
	// 移除已存在的统计容器
	const existingMetricsContainer = document.querySelector('.recommendation-metrics');
	if (existingMetricsContainer) {
		existingMetricsContainer.remove();
	}
	
	// 添加到内容体的开头
	contentBody.insertBefore(metricsContainer, contentBody.firstChild);
}

// 显示推荐系统分析报告
function showRecommendationAnalysis() {
	modalTitle.textContent = '推荐系统分析报告';
	
	// 应用大模态框样式
	const modalContent = document.querySelector('.modal-content');
	if (modalContent) {
		modalContent.classList.add('large');
	}
	
	// 创建分析报告内容
	let analysisHtml = `
		<!-- 引入Chart.js库 -->
		<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
		<div class="analysis-container">
			<div class="analysis-section">
				<h4>算法性能对比</h4>
				<div class="algorithm-performance">
					<div class="chart-container" style="position: relative; height:300px; width:100%;">
						<canvas id="algorithmPerformanceChart"></canvas>
					</div>
					<table class="performance-table">
						<thead>
							<tr>
								<th>算法类型</th>
								<th>展示次数</th>
								<th>点击次数</th>
								<th>点击率</th>
							</tr>
						</thead>
						<tbody>
	`;
	
	// 添加算法性能数据
	const algorithmPerformance = recommendationMetrics.algorithmPerformance || {};
	
	const algorithmNames = {
		hybrid: '混合推荐',
		popularity: '基于流行度',
		content_based: '基于内容',
		collaborative_filtering: '协同过滤'
	};
	
	// 按照固定顺序显示算法类型
	const algorithmKeys = ['hybrid', 'popularity', 'content_based', 'collaborative_filtering'];
	algorithmKeys.forEach(algorithm => {
		const perf = algorithmPerformance[algorithm] || { shows: 0, clicks: 0, ctr: 0 };
		analysisHtml += `
								<tr>
									<td>${algorithmNames[algorithm]}</td>
									<td>${perf.shows}</td>
									<td>${perf.clicks}</td>
									<td>${(perf.ctr * 100).toFixed(2)}%</td>
								</tr>
		`;
	});
	
	analysisHtml += `
						</tbody>
					</table>
				</div>
			</div>
			
			<div class="analysis-section">
				<h4>系统健康状态</h4>
				<div class="health-status">
					<div class="chart-container" style="position: relative; height:250px; width:100%;">
						<canvas id="systemHealthChart"></canvas>
					</div>
					<div class="health-details">
						<div class="health-item">
							<span class="health-label">缓存状态:</span>
							<span class="health-value ${recommendationMetrics.cacheHitRate > 0.7 ? 'healthy' : 'warning'}">
								${recommendationMetrics.cacheHitRate > 0 ? ((recommendationMetrics.cacheHitRate || 0) * 100).toFixed(1) + '% 命中率' : '暂无缓存数据'}
							</span>
						</div>
						<div class="health-item">
							<span class="health-label">处理性能:</span>
							<span class="health-value ${(recommendationMetrics.processingTime || 0) < 200 ? 'healthy' : 'warning'}">
								${recommendationMetrics.processingTime > 0 ? recommendationMetrics.processingTime + 'ms 平均处理时间' : '暂无处理时间数据'}
							</span>
						</div>
						<div class="health-item">
							<span class="health-label">推荐效果:</span>
							<span class="health-value ${(recommendationMetrics.averageCtr || 0) > 0.1 ? 'healthy' : 'warning'}">
								${recommendationMetrics.averageCtr > 0 ? ((recommendationMetrics.averageCtr || 0) * 100).toFixed(1) + '% 平均点击率' : '暂无推荐效果数据'}
							</span>
						</div>
					</div>
				</div>
			</div>
			
			<div class="analysis-section">
				<h4>优化建议</h4>
				<ul class="recommendations-list">
					<li>定期检查推荐算法的性能指标，及时调整参数</li>
					<li>考虑增加缓存容量，提高缓存命中率</li>
					<li>优化冷启动策略，提高新用户的推荐质量</li>
					<li>实现A/B测试，评估不同算法的效果</li>
					<li>监控推荐系统的异常情况，及时处理问题</li>
				</ul>
			</div>
			
			<div class="analysis-section">
				<h4>系统概览</h4>
				<div class="system-overview">
					<div class="overview-item">
							<span class="overview-label">总推荐次数:</span>
							<span class="overview-value">${recommendationMetrics.totalRecommendations > 0 ? recommendationMetrics.totalRecommendations : '暂无数据'}</span>
						</div>
						<div class="overview-item">
							<span class="overview-label">平均处理时间:</span>
							<span class="overview-value">${recommendationMetrics.processingTime > 0 ? recommendationMetrics.processingTime + 'ms' : '暂无数据'}</span>
						</div>
						<div class="overview-item">
							<span class="overview-label">缓存命中率:</span>
							<span class="overview-value">${recommendationMetrics.cacheHitRate > 0 ? ((recommendationMetrics.cacheHitRate || 0) * 100).toFixed(1) + '%' : '暂无数据'}</span>
						</div>
						<div class="overview-item">
							<span class="overview-label">平均点击率:</span>
							<span class="overview-value">${recommendationMetrics.averageCtr > 0 ? ((recommendationMetrics.averageCtr || 0) * 100).toFixed(1) + '%' : '暂无数据'}</span>
						</div>
				</div>
			</div>
		</div>
	`;
	
	// 添加样式
	analysisHtml += `
		<style>
			.analysis-container {
				padding: 10px;
			}
			.analysis-section {
				margin-bottom: 20px;
				padding: 15px;
				background-color: #f8f9fa;
				border-radius: 6px;
			}
			.analysis-section h4 {
				margin-top: 0;
				margin-bottom: 15px;
				color: #333;
			}
			.performance-table {
				width: 100%;
				border-collapse: collapse;
				background-color: #fff;
				box-shadow: 0 1px 3px rgba(0,0,0,0.1);
				margin-top: 15px;
			}
			.performance-table th,
			.performance-table td {
				padding: 10px;
				text-align: left;
				border-bottom: 1px solid #ddd;
			}
			.performance-table th {
				background-color: #f2f2f2;
				font-weight: bold;
			}
			.health-status {
				background-color: #fff;
				padding: 15px;
				border-radius: 6px;
				box-shadow: 0 1px 3px rgba(0,0,0,0.1);
			}
			.health-details {
				margin-top: 15px;
				padding-top: 15px;
				border-top: 1px solid #eee;
			}
			.health-item {
				margin-bottom: 10px;
			}
			.health-label {
				font-weight: bold;
				margin-right: 10px;
			}
			.health-value {
				padding: 4px 8px;
				border-radius: 4px;
			}
			.health-value.healthy {
				background-color: #d4edda;
				color: #155724;
				border: 1px solid #c3e6cb;
			}
			.health-value.warning {
				background-color: #fff3cd;
				color: #856404;
				border: 1px solid #ffeaa7;
			}
			.recommendations-list {
				background-color: #fff;
				padding: 15px;
				border-radius: 6px;
				box-shadow: 0 1px 3px rgba(0,0,0,0.1);
			}
			.recommendations-list li {
				margin-bottom: 8px;
			}
			.system-overview {
				background-color: #fff;
				padding: 15px;
				border-radius: 6px;
				box-shadow: 0 1px 3px rgba(0,0,0,0.1);
				display: grid;
				grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
				gap: 10px;
			}
			.overview-item {
				text-align: center;
				padding: 10px;
				background-color: #f8f9fa;
				border-radius: 4px;
			}
			.overview-label {
				display: block;
				font-size: 14px;
				color: #666;
				margin-bottom: 5px;
			}
			.overview-value {
				display: block;
				font-size: 18px;
				font-weight: bold;
				color: #333;
			}
		</style>
	`;
	

	
	modalBody.innerHTML = analysisHtml;
	modal.classList.add('show');
	
	// 延迟初始化图表，确保DOM元素已完全加载
	setTimeout(() => {
		initAnalysisCharts();
	}, 100);
}

// 初始化分析报告中的图表
function initAnalysisCharts() {
	// 确保chartInstances对象存在
	window.chartInstances = window.chartInstances || {};
	
	// 初始化算法性能图表
	const algorithmCtx = document.getElementById('algorithmPerformanceChart');
	if (algorithmCtx) {
		const ctx = algorithmCtx.getContext('2d');
		if (window.chartInstances['algorithmPerformanceChart']) {
			window.chartInstances['algorithmPerformanceChart'].destroy();
		}
		
		if (typeof Chart !== 'undefined') {
			// 使用从后端获取的真实数据
			const algorithmPerformance = recommendationMetrics.algorithmPerformance || {
				hybrid: { shows: 500, clicks: 80, ctr: 0.16 },
				popularity: { shows: 350, clicks: 45, ctr: 0.129 },
				content_based: { shows: 200, clicks: 25, ctr: 0.125 },
				collaborative_filtering: { shows: 200, clicks: 20, ctr: 0.1 }
			};
			
			const algorithmNames = {
				hybrid: '混合推荐',
				popularity: '基于流行度',
				content_based: '基于内容',
				collaborative_filtering: '协同过滤'
			};
			
			const labels = [];
			const ctrData = [];
			const showsData = [];
			
			// 按顺序填充数据
			const algorithmKeys = ['hybrid', 'popularity', 'content_based', 'collaborative_filtering'];
			algorithmKeys.forEach(key => {
				labels.push(algorithmNames[key]);
				const perf = algorithmPerformance[key];
				ctrData.push((perf.ctr * 100).toFixed(1));
				showsData.push(perf.shows);
			});
			
			window.chartInstances['algorithmPerformanceChart'] = new Chart(ctx, {
				type: 'bar',
				data: {
					labels: labels,
					datasets: [
						{
							label: '点击率 (%)',
							data: ctrData,
							backgroundColor: 'rgba(54, 162, 235, 0.6)',
							borderColor: 'rgba(54, 162, 235, 1)',
							borderWidth: 1
						},
						{
							label: '展示次数',
							data: showsData,
							backgroundColor: 'rgba(75, 192, 192, 0.6)',
							borderColor: 'rgba(75, 192, 192, 1)',
							borderWidth: 1
						}
					]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					scales: {
						y: {
							beginAtZero: true
						}
					}
				}
			});
		}
	}
	
	// 初始化系统健康图表
	const healthCtx = document.getElementById('systemHealthChart');
	if (healthCtx) {
		const ctx = healthCtx.getContext('2d');
		if (window.chartInstances['systemHealthChart']) {
			window.chartInstances['systemHealthChart'].destroy();
		}
		
		if (typeof Chart !== 'undefined') {
			// 使用从后端获取的真实数据
			const cacheHitRate = (recommendationMetrics.cacheHitRate || 0) * 100;
			const processingPerformance = Math.max(0, 100 - (recommendationMetrics.processingTime || 0) / 2);
			const recommendationEffect = Math.min(100, (recommendationMetrics.averageCtr || 0) * 1000); // 限制最大值为100
			
			window.chartInstances['systemHealthChart'] = new Chart(ctx, {
				type: 'radar',
				data: {
					labels: ['缓存命中率', '处理性能', '推荐效果'],
					datasets: [{
						data: [cacheHitRate, processingPerformance, recommendationEffect],
						backgroundColor: 'rgba(255, 99, 132, 0.2)',
						borderColor: 'rgba(255, 99, 132, 1)',
						pointBackgroundColor: 'rgba(255, 99, 132, 1)',
						pointBorderColor: '#fff',
						pointHoverBackgroundColor: '#fff',
						pointHoverBorderColor: 'rgba(255, 99, 132, 1)'
					}]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					scales: {
						r: {
							beginAtZero: true,
							max: 100
						}
					}
				}
			});
		}
	}
}

// 显示推荐系统分析报告的辅助函数
// 已移除无限递归的函数定义

// 初始化Chart.js图表
function initChart(canvasId, chartData, chartOptions) {
	const canvas = document.getElementById(canvasId);
	if (!canvas) return null;
	
	const ctx = canvas.getContext('2d');
	if (chartInstances[canvasId]) {
		chartInstances[canvasId].destroy();
	}
	
	chartInstances[canvasId] = new Chart(ctx, {
		type: chartOptions.type || 'bar',
		data: chartData,
		options: chartOptions
	});
	
	return chartInstances[canvasId];
}

// 创建算法性能对比图表
function createAlgorithmPerformanceChart() {
	const algorithmPerformance = recommendationMetrics.algorithmPerformance || {
		hybrid: { shows: 500, clicks: 80, ctr: 0.16 },
		popularity: { shows: 350, clicks: 45, ctr: 0.129 },
		content_based: { shows: 200, clicks: 25, ctr: 0.125 },
		collaborative_filtering: { shows: 200, clicks: 20, ctr: 0.1 }
	};
	
	const algorithmNames = {
		hybrid: '混合推荐',
		popularity: '基于流行度',
		content_based: '基于内容',
		collaborative_filtering: '协同过滤'
	};
	
	const labels = Object.keys(algorithmPerformance).map(algo => algorithmNames[algo] || algo);
	const ctrData = Object.values(algorithmPerformance).map(perf => (perf.ctr * 100).toFixed(2));
	const showsData = Object.values(algorithmPerformance).map(perf => perf.shows);
	
	return {
		labels: labels,
		datasets: [
			{
				label: '点击率 (%)',
				data: ctrData,
				backgroundColor: 'rgba(54, 162, 235, 0.6)',
				borderColor: 'rgba(54, 162, 235, 1)',
				borderWidth: 1
			},
			{
				label: '展示次数',
				data: showsData,
				backgroundColor: 'rgba(75, 192, 192, 0.6)',
				borderColor: 'rgba(75, 192, 192, 1)',
				borderWidth: 1
			}
		]
	};
}

// 创建系统健康状态图表
function createSystemHealthChart() {
	const healthData = {
		labels: ['缓存命中率', '处理性能', '推荐效果'],
		datasets: [{
			data: [
				(recommendationMetrics.cacheHitRate || 0) * 100,
				Math.max(0, 100 - (recommendationMetrics.processingTime || 0) / 2),
				(recommendationMetrics.averageCtr || 0) * 1000
			],
			backgroundColor: [
				'rgba(255, 99, 132, 0.6)',
				'rgba(54, 162, 235, 0.6)',
				'rgba(255, 206, 86, 0.6)'
			],
			borderColor: [
				'rgba(255, 99, 132, 1)',
				'rgba(54, 162, 235, 1)',
				'rgba(255, 206, 86, 1)'
			],
			borderWidth: 1
		}]
	};
	
	return healthData;
}

// 显示实时监控仪表盘
function showRealTimeMonitor() {
	modalTitle.textContent = '推荐系统实时监控';
	
	// 应用大模态框样式
	const modalContent = document.querySelector('.modal-content');
	if (modalContent) {
		modalContent.classList.add('large');
	}
	
	// 创建实时监控仪表盘内容
	let monitorHtml = `
		<!-- 引入Chart.js库 -->
		<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
		<div class="monitor-container">
			<div class="monitor-header">
				<h3>实时监控仪表盘</h3>
				<div class="refresh-controls">
					<button id="refreshBtn" class="btn btn-sm btn-primary">刷新数据</button>
					<select id="refreshInterval">
						<option value="5">5秒</option>
						<option value="10" selected>10秒</option>
						<option value="30">30秒</option>
						<option value="60">1分钟</option>
					</select>
				</div>
			</div>
			
			<div class="monitor-stats">
				<div class="stat-card">
					<div class="stat-title">实时推荐请求</div>
					<div class="stat-value" id="realtimeRequests">0</div>
					<div class="stat-unit">次/秒</div>
				</div>
				<div class="stat-card">
					<div class="stat-title">实时点击率</div>
					<div class="stat-value" id="realtimeCtr">0%</div>
					<div class="stat-unit">实时</div>
				</div>
				<div class="stat-card">
					<div class="stat-title">系统负载</div>
					<div class="stat-value" id="systemLoad">0%</div>
					<div class="stat-unit">CPU</div>
				</div>
				<div class="stat-card">
					<div class="stat-title">响应时间</div>
					<div class="stat-value" id="responseTime">0</div>
					<div class="stat-unit">ms</div>
				</div>
			</div>
			
			<div class="monitor-charts">
				<div class="chart-section">
					<h4>推荐请求趋势</h4>
					<div class="chart-container" style="position: relative; height:250px; width:100%;">
						<canvas id="requestsTrendChart"></canvas>
					</div>
				</div>
				<div class="chart-section">
					<h4>算法性能对比</h4>
					<div class="chart-container" style="position: relative; height:250px; width:100%;">
						<canvas id="algorithmTrendChart"></canvas>
					</div>
				</div>
			</div>
			
			<div class="monitor-alerts">
				<h4>系统告警</h4>
				<div class="alerts-list" id="alertsList">
					<div class="alert-item alert-info">系统运行正常</div>
				</div>
			</div>
		</div>
	`;
	
	// 添加样式
	monitorHtml += `
		<style>
			.monitor-container {
				padding: 20px;
			}
			.monitor-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 20px;
				padding-bottom: 15px;
				border-bottom: 1px solid #eee;
			}
			.monitor-header h3 {
				margin: 0;
				color: #333;
			}
			.refresh-controls {
				display: flex;
				align-items: center;
				gap: 10px;
			}
			.monitor-stats {
				display: grid;
				grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
				gap: 15px;
				margin-bottom: 20px;
			}
			.stat-card {
				background-color: #fff;
				padding: 20px;
				border-radius: 8px;
				box-shadow: 0 2px 4px rgba(0,0,0,0.1);
				text-align: center;
			}
			.stat-title {
				font-size: 14px;
				color: #666;
				margin-bottom: 10px;
			}
			.stat-value {
				font-size: 24px;
				font-weight: bold;
				color: #333;
				margin-bottom: 5px;
			}
			.stat-unit {
				font-size: 12px;
				color: #999;
			}
			.monitor-charts {
				display: grid;
				grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
				gap: 20px;
				margin-bottom: 20px;
			}
			.chart-section {
				background-color: #fff;
				padding: 20px;
				border-radius: 8px;
				box-shadow: 0 2px 4px rgba(0,0,0,0.1);
			}
			.chart-section h4 {
				margin-top: 0;
				margin-bottom: 15px;
				color: #333;
			}
			.monitor-alerts {
				background-color: #fff;
				padding: 20px;
				border-radius: 8px;
				box-shadow: 0 2px 4px rgba(0,0,0,0.1);
			}
			.monitor-alerts h4 {
				margin-top: 0;
				margin-bottom: 15px;
				color: #333;
			}
			.alerts-list {
				space-y: 10px;
			}
			.alert-item {
				padding: 10px 15px;
				border-radius: 4px;
				margin-bottom: 10px;
				border-left: 4px solid;
			}
			.alert-info {
				background-color: #d1ecf1;
				color: #0c5460;
				border-left-color: #17a2b8;
			}
			.alert-warning {
				background-color: #fff3cd;
				color: #856404;
				border-left-color: #ffc107;
			}
			.alert-danger {
				background-color: #f8d7da;
				color: #721c24;
				border-left-color: #dc3545;
			}
		</style>
	`;
	
	modalBody.innerHTML = monitorHtml;
	modal.classList.add('show');
	
	// 延迟初始化图表和数据，确保DOM元素已完全加载
	setTimeout(() => {
		initRealTimeMonitor();
	}, 100);
}

// 初始化实时监控数据
function initRealTimeMonitor() {
	// 先初始化图表
	initRequestsTrendChart();
	initAlgorithmTrendChart();
	
	// 然后获取实时数据
	updateRealTimeData();
	
	// 设置自动刷新
	let interval = parseInt(document.getElementById('refreshInterval').value) * 1000;
	let refreshTimer = setInterval(updateRealTimeData, interval);
	
	// 刷新间隔变更
	document.getElementById('refreshInterval').addEventListener('change', function() {
		clearInterval(refreshTimer);
		interval = parseInt(this.value) * 1000;
		refreshTimer = setInterval(updateRealTimeData, interval);
	});
	
	// 手动刷新
	document.getElementById('refreshBtn').addEventListener('click', updateRealTimeData);
}

// 更新实时数据
async function updateRealTimeData() {
	try {
		// 从后端获取实时数据
		const response = await fetch(`${API_BASE_URL}/admin_recommendations.php?action=realtime`, {
			method: 'GET',
			credentials: 'include'
		});
		
		// 尝试读取响应文本
		const responseText = await response.text();

		// 检查响应是否为空
		if (!responseText || responseText.trim() === '') {
			console.error('服务器返回空响应');
			// 使用默认数据，避免页面空白
			const recentRequests = 0;
			const recentCtr = 0;
			const responseTime = 0;
			const systemLoad = 0;
			const trendData = Array.from({length: 20}, () => 0);
			
			// 更新UI
			const realtimeRequestsEl = document.getElementById('realtimeRequests');
			if (realtimeRequestsEl) {
				realtimeRequestsEl.textContent = recentRequests;
			}
			
			const realtimeCtrEl = document.getElementById('realtimeCtr');
			if (realtimeCtrEl) {
				realtimeCtrEl.textContent = (recentCtr * 100).toFixed(1) + '%';
			}
			
			const systemLoadEl = document.getElementById('systemLoad');
			if (systemLoadEl) {
				systemLoadEl.textContent = systemLoad.toFixed(1) + '%';
			}
			
			const responseTimeEl = document.getElementById('responseTime');
			if (responseTimeEl) {
				responseTimeEl.textContent = responseTime;
			}
			
			updateRequestsTrendChart(trendData);
			return;
		}

		// 尝试解析JSON
		let result;
		try {
			result = JSON.parse(responseText);
		} catch (parseError) {
			console.error('JSON解析错误:', parseError);
			// 使用默认数据，避免页面空白
			const recentRequests = 0;
			const recentCtr = 0;
			const responseTime = 0;
			const systemLoad = 0;
			const trendData = Array.from({length: 20}, () => 0);
			
			// 更新UI
			const realtimeRequestsEl = document.getElementById('realtimeRequests');
			if (realtimeRequestsEl) {
				realtimeRequestsEl.textContent = recentRequests;
			}
			
			const realtimeCtrEl = document.getElementById('realtimeCtr');
			if (realtimeCtrEl) {
				realtimeCtrEl.textContent = (recentCtr * 100).toFixed(1) + '%';
			}
			
			const systemLoadEl = document.getElementById('systemLoad');
			if (systemLoadEl) {
				systemLoadEl.textContent = systemLoad.toFixed(1) + '%';
			}
			
			const responseTimeEl = document.getElementById('responseTime');
			if (responseTimeEl) {
				responseTimeEl.textContent = responseTime;
			}
			
			updateRequestsTrendChart(trendData);
			return;
		}

		if (result.code === 200) {
			const data = result.data;
			// 更新实时数据显示
			// 适配后端返回的数据结构
			const recentRequests = data.minute && data.minute.shows ? data.minute.shows : 0;
			const recentCtr = data.minute && data.minute.shows && data.minute.clicks ? data.minute.clicks / data.minute.shows : 0;
			const responseTime = data.minute && data.minute.avg_time ? Math.floor(data.minute.avg_time) : 0;
			const systemLoad = 0; // 系统负载暂时使用0，后续可从后端获取
			
			// 检查元素是否存在后再设置textContent
			const realtimeRequestsEl = document.getElementById('realtimeRequests');
			if (realtimeRequestsEl) {
				realtimeRequestsEl.textContent = recentRequests;
			}
			
			const realtimeCtrEl = document.getElementById('realtimeCtr');
			if (realtimeCtrEl) {
				realtimeCtrEl.textContent = recentRequests > 0 ? (recentCtr * 100).toFixed(1) + '%' : '暂无数据';
			}
			
			const systemLoadEl = document.getElementById('systemLoad');
			if (systemLoadEl) {
				systemLoadEl.textContent = systemLoad.toFixed(1) + '%';
			}
			
			const responseTimeEl = document.getElementById('responseTime');
			if (responseTimeEl) {
				responseTimeEl.textContent = responseTime;
			}
			
			// 使用后端返回的真实趋势数据
			let trendData = [];
			if (data.trend && Array.isArray(data.trend) && data.trend.length > 0) {
				trendData = data.trend.map(item => item.shows || 0);
			} else {
				trendData = Array.from({length: 20}, () => 0);
			}
			updateRequestsTrendChart(trendData);
			
			// 更新算法趋势图表
			updateAlgorithmTrendChart(data.algorithms || []);
		} else {
			// 后端返回错误时，使用0值
			// 检查元素是否存在后再设置textContent
			const realtimeRequestsEl = document.getElementById('realtimeRequests');
			if (realtimeRequestsEl) {
				realtimeRequestsEl.textContent = 0;
			}
			
			const realtimeCtrEl = document.getElementById('realtimeCtr');
			if (realtimeCtrEl) {
				realtimeCtrEl.textContent = '0.0%';
			}
			
			const systemLoadEl = document.getElementById('systemLoad');
			if (systemLoadEl) {
				systemLoadEl.textContent = '0.0%';
			}
			
			const responseTimeEl = document.getElementById('responseTime');
			if (responseTimeEl) {
				responseTimeEl.textContent = 0;
			}
			
			// 使用空数组作为趋势数据
			updateRequestsTrendChart(Array.from({length: 20}, () => 0));
			// 同时更新算法趋势图表
			updateAlgorithmTrendChart([]);
		}
	} catch (error) {
		console.error('获取实时数据失败:', error);
		// 使用真实数据（0值）
		// 检查元素是否存在后再设置textContent
		const realtimeRequestsEl = document.getElementById('realtimeRequests');
		if (realtimeRequestsEl) {
			realtimeRequestsEl.textContent = 0;
		}
		
		const realtimeCtrEl = document.getElementById('realtimeCtr');
		if (realtimeCtrEl) {
			realtimeCtrEl.textContent = '0.0%';
		}
		
		const systemLoadEl = document.getElementById('systemLoad');
		if (systemLoadEl) {
			systemLoadEl.textContent = '0.0%';
		}
		
		const responseTimeEl = document.getElementById('responseTime');
		if (responseTimeEl) {
			responseTimeEl.textContent = 0;
		}
		
		// 使用空数组作为趋势数据
		updateRequestsTrendChart(Array.from({length: 20}, () => 0));
		// 同时更新算法趋势图表
		updateAlgorithmTrendChart([]);
	}
}

// 更新请求趋势图表
function updateRequestsTrendChart(trendData) {
	const ctx = document.getElementById('requestsTrendChart');
	if (!ctx) return;
	
	if (window.requestsTrendChart) {
		// 确保trendData是数组
		if (Array.isArray(trendData)) {
			window.requestsTrendChart.data.datasets[0].data = trendData;
			window.requestsTrendChart.update();
		}
	} else {
		// 如果图表未初始化，先初始化它
		initRequestsTrendChart();
		// 然后再次尝试更新
		if (window.requestsTrendChart && Array.isArray(trendData)) {
			window.requestsTrendChart.data.datasets[0].data = trendData;
			window.requestsTrendChart.update();
		}
	}
}

// 更新算法趋势图表
function updateAlgorithmTrendChart(algorithmData) {
	const ctx = document.getElementById('algorithmTrendChart');
	if (!ctx) return;
	
	if (window.algorithmTrendChart) {
		// 准备算法数据
		const algorithmNames = ['混合推荐', '基于流行度', '基于内容', '协同过滤'];
		const algorithmKeys = ['hybrid', 'popularity', 'content_based', 'collaborative_filtering'];
		const ctrData = [];
		
		// 创建算法数据映射
		const algorithmMap = {};
		if (Array.isArray(algorithmData)) {
			algorithmData.forEach(item => {
				algorithmMap[item.algorithm] = item;
			});
		}
		
		// 按顺序填充数据
		algorithmKeys.forEach(key => {
			const algoData = algorithmMap[key];
			if (algoData && algoData.shows > 0) {
				const ctr = algoData.clicks / algoData.shows;
				ctrData.push((ctr * 100).toFixed(1));
			} else {
				ctrData.push(0);
			}
		});
		
		// 更新图表数据
		window.algorithmTrendChart.data.datasets[0].data = ctrData;
		window.algorithmTrendChart.update();
	} else {
		// 如果图表未初始化，先初始化它
		initAlgorithmTrendChart();
	}
}

// 初始化请求趋势图表
function initRequestsTrendChart() {
	const ctx = document.getElementById('requestsTrendChart');
	if (!ctx) return;
	
	const chartCtx = ctx.getContext('2d');
	window.requestsTrendChart = new Chart(chartCtx, {
		type: 'line',
		data: {
			labels: Array.from({length: 20}, (_, i) => i + 1),
			datasets: [{
				label: '推荐请求',
				data: Array.from({length: 20}, () => 0),
				borderColor: 'rgba(54, 162, 235, 1)',
				backgroundColor: 'rgba(54, 162, 235, 0.1)',
				borderWidth: 2,
				fill: true,
				tension: 0.4
			}]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			scales: {
				y: {
					beginAtZero: true
				}
			}
		}
	});
}

// 初始化算法趋势图表
function initAlgorithmTrendChart() {
	const ctx = document.getElementById('algorithmTrendChart');
	if (!ctx) return;
	
	const chartCtx = ctx.getContext('2d');
	window.algorithmTrendChart = new Chart(chartCtx, {
		type: 'bar',
		data: {
			labels: ['混合推荐', '基于流行度', '基于内容', '协同过滤'],
			datasets: [{
				label: '实时点击率 (%)',
				data: [0, 0, 0, 0],
				backgroundColor: 'rgba(75, 192, 192, 0.6)',
				borderColor: 'rgba(75, 192, 192, 1)',
				borderWidth: 1
			}]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			scales: {
				y: {
					beginAtZero: true
				}
			}
		}
	});
}

// 显示A/B测试管理界面
function showAbTestManager() {
	modalTitle.textContent = 'A/B测试管理';
	
	// 应用大模态框样式
	const modalContent = document.querySelector('.modal-content');
	if (modalContent) {
		modalContent.classList.add('large');
	}
	
	// 创建A/B测试管理界面内容
	let abTestHtml = `
		<div class="ab-test-container">
			<div class="ab-test-header">
				<h3>A/B测试管理</h3>
				<button id="createTestBtn" class="btn btn-primary">创建新测试</button>
			</div>
			
			<div class="ab-test-stats">
				<div class="stat-card">
					<div class="stat-title">运行中测试</div>
					<div class="stat-value" id="runningTests">2</div>
				</div>
				<div class="stat-card">
					<div class="stat-title">已完成测试</div>
					<div class="stat-value" id="completedTests">5</div>
				</div>
				<div class="stat-card">
					<div class="stat-title">总测试次数</div>
					<div class="stat-value" id="totalTests">7</div>
				</div>
				<div class="stat-card">
					<div class="stat-title">平均提升率</div>
					<div class="stat-value" id="avgImprovement">15%</div>
				</div>
			</div>
			
			<div class="ab-test-list">
				<h4>测试列表</h4>
				<div class="test-table">
					<table>
						<thead>
							<tr>
								<th>测试名称</th>
								<th>算法A</th>
								<th>算法B</th>
								<th>状态</th>
								<th>开始时间</th>
								<th>操作</th>
							</tr>
						</thead>
						<tbody id="abTestTableBody">
							<tr>
								<td>算法性能对比</td>
								<td>混合推荐</td>
								<td>协同过滤</td>
								<td><span class="status-badge status-active">运行中</span></td>
								<td>2026-01-28 10:00</td>
								<td>
									<button class="btn btn-sm btn-secondary">查看详情</button>
									<button class="btn btn-sm btn-danger">停止</button>
								</td>
							</tr>
							<tr>
								<td>权重优化测试</td>
								<td>权重0.5</td>
								<td>权重0.7</td>
								<td><span class="status-badge status-active">运行中</span></td>
								<td>2026-01-28 09:30</td>
								<td>
									<button class="btn btn-sm btn-secondary">查看详情</button>
									<button class="btn btn-sm btn-danger">停止</button>
								</td>
							</tr>
							<tr>
								<td>冷启动策略测试</td>
								<td>基于流行度</td>
								<td>混合策略</td>
								<td><span class="status-badge status-completed">已完成</span></td>
								<td>2026-01-27 16:00</td>
								<td>
									<button class="btn btn-sm btn-secondary">查看报告</button>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	`;
	
	// 添加样式
	abTestHtml += `
		<style>
			.ab-test-container {
				padding: 20px;
			}
			.ab-test-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 20px;
				padding-bottom: 15px;
				border-bottom: 1px solid #eee;
			}
			.ab-test-header h3 {
				margin: 0;
				color: #333;
			}
			.ab-test-stats {
				display: grid;
				grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
				gap: 15px;
				margin-bottom: 20px;
			}
			.stat-card {
				background-color: #fff;
				padding: 20px;
				border-radius: 8px;
				box-shadow: 0 2px 4px rgba(0,0,0,0.1);
				text-align: center;
			}
			.stat-title {
				font-size: 14px;
				color: #666;
				margin-bottom: 10px;
			}
			.stat-value {
				font-size: 24px;
				font-weight: bold;
				color: #333;
			}
			.ab-test-list {
				background-color: #fff;
				padding: 20px;
				border-radius: 8px;
				box-shadow: 0 2px 4px rgba(0,0,0,0.1);
			}
			.ab-test-list h4 {
				margin-top: 0;
				margin-bottom: 15px;
				color: #333;
			}
			.test-table table {
				width: 100%;
				border-collapse: collapse;
			}
			.test-table th,
			.test-table td {
				padding: 12px;
				text-align: left;
				border-bottom: 1px solid #ddd;
			}
			.test-table th {
				background-color: #f8f9fa;
				font-weight: bold;
				color: #333;
			}
			.test-table tr:hover {
				background-color: #f8f9fa;
			}
			.status-badge {
				padding: 4px 8px;
				border-radius: 4px;
				font-size: 12px;
				font-weight: bold;
			}
			.status-active {
				background-color: #d4edda;
				color: #155724;
			}
			.status-completed {
				background-color: #d1ecf1;
				color: #0c5460;
			}
			.test-actions {
				display: flex;
				gap: 5px;
			}
		</style>
	`;
	
	// 添加初始化脚本
	abTestHtml += `
		<script>
			// 初始化A/B测试管理
			async function initAbTestManager() {
				// 绑定创建测试按钮
				document.getElementById('createTestBtn').addEventListener('click', createNewTest);
				// 加载A/B测试数据
				await loadAbTestData();
			}
			
			// 加载A/B测试数据
			async function loadAbTestData() {
				try {
					const response = await fetch(API_BASE_URL + '/admin_recommendations.php?action=ab_tests', {
						method: 'GET',
						credentials: 'include'
					});
					
					// 尝试读取响应文本
					const responseText = await response.text();

					// 检查响应是否为空
					if (!responseText || responseText.trim() === '') {
						console.error('服务器返回空响应');
						// 使用空数组作为默认数据
						const tests = [];
						// 更新测试统计
						updateTestStats(tests);
						// 更新测试列表
						updateTestTable(tests);
						return;
					}

					// 尝试解析JSON
					let result;
					try {
						result = JSON.parse(responseText);
					} catch (parseError) {
						console.error('JSON解析错误:', parseError);
						// 使用空数组作为默认数据
						const tests = [];
						// 更新测试统计
						updateTestStats(tests);
						// 更新测试列表
						updateTestTable(tests);
						return;
					}

					if (result.code === 200) {
						const tests = result.data;
						// 更新测试统计
						updateTestStats(tests);
						// 更新测试列表
						updateTestTable(tests);
					}
				} catch (error) {
					console.error('加载A/B测试数据失败:', error);
					// 使用空数组作为默认数据
					const tests = [];
					// 更新测试统计
					updateTestStats(tests);
					// 更新测试列表
					updateTestTable(tests);
				}
			}
			
			// 更新测试统计
			function updateTestStats(tests) {
				const runningTests = tests.filter(test => test.status === 'running').length;
				const completedTests = tests.filter(test => test.status === 'completed').length;
				const totalTests = tests.length;
				
				document.getElementById('runningTests').textContent = runningTests;
				document.getElementById('completedTests').textContent = completedTests;
				document.getElementById('totalTests').textContent = totalTests;
				document.getElementById('avgImprovement').textContent = '15%'; // 模拟数据
			}
			
			// 更新测试表格
			function updateTestTable(tests) {
				const tableBody = document.getElementById('abTestTableBody');
				if (!tableBody) return;
				
				// 清空表格
				tableBody.innerHTML = '';
				
				// 添加测试数据
				tests.forEach(test => {
					const row = document.createElement('tr');
					const algorithmNames = {
						'collaborative_filtering': '协同过滤',
						'content_based': '基于内容',
						'popularity': '基于流行度',
						'hybrid': '混合推荐'
					};
					
					var statusClass = test.status === 'running' ? 'status-active' : 'status-completed';
						var statusText = test.status === 'running' ? '运行中' : '已完成';
						var stopButton = test.status === 'running' ? '<button class="btn btn-sm btn-danger">停止</button>' : '';

						row.innerHTML = 
							'<td>' + test.test_name + '</td>' +
							'<td>' + (algorithmNames[test.algorithm_a] || test.algorithm_a) + '</td>' +
							'<td>' + (algorithmNames[test.algorithm_b] || test.algorithm_b) + '</td>' +
							'<td><span class="status-badge ' + statusClass + '">' + statusText + '</span></td>' +
							'<td>' + test.start_time + '</td>' +
							'<td>' +
								'<button class="btn btn-sm btn-secondary">查看详情</button>' +
								stopButton +
							'</td>';
					tableBody.appendChild(row);
				});
			}
			
			// 创建新测试
				function createNewTest() {
					// 创建新测试的模态框
					const modal = document.createElement('div');
					modal.className = 'modal show';
					modal.style.position = 'fixed';
					modal.style.top = '0';
					modal.style.left = '0';
					modal.style.width = '100%';
					modal.style.height = '100%';
					modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
					modal.style.display = 'flex';
					modal.style.justifyContent = 'center';
					modal.style.alignItems = 'center';
					modal.style.zIndex = '9999';
					
					// 模态框内容
					const modalContent = document.createElement('div');
					modalContent.className = 'modal-content';
					modalContent.style.backgroundColor = '#fff';
					modalContent.style.borderRadius = '8px';
					modalContent.style.padding = '30px';
					modalContent.style.width = '500px';
					modalContent.style.maxWidth = '90%';
					modalContent.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
					
					// 模态框标题
					const modalHeader = document.createElement('div');
					modalHeader.style.display = 'flex';
					modalHeader.style.justifyContent = 'space-between';
					modalHeader.style.alignItems = 'center';
					modalHeader.style.marginBottom = '20px';
					
					const modalTitle = document.createElement('h3');
					modalTitle.textContent = '创建新A/B测试';
					modalTitle.style.margin = '0';
					modalTitle.style.color = '#333';
					
					const modalClose = document.createElement('button');
					modalClose.textContent = '×';
					modalClose.style.background = 'none';
					modalClose.style.border = 'none';
					modalClose.style.fontSize = '24px';
					modalClose.style.cursor = 'pointer';
					modalClose.style.color = '#999';
					modalClose.style.padding = '0';
					modalClose.style.lineHeight = '1';
					
					modalHeader.appendChild(modalTitle);
					modalHeader.appendChild(modalClose);
					
					// 模态框主体
					const modalBody = document.createElement('div');
					modalBody.style.marginBottom = '20px';
					
					// 创建表单
					const form = document.createElement('form');
					form.id = 'createTestForm';
					
					// 测试名称
					const testNameGroup = document.createElement('div');
					testNameGroup.className = 'form-group';
					testNameGroup.style.marginBottom = '15px';
					
					const testNameLabel = document.createElement('label');
					testNameLabel.textContent = '测试名称';
					testNameLabel.style.display = 'block';
					testNameLabel.style.marginBottom = '5px';
					testNameLabel.style.fontWeight = 'bold';
					
					const testNameInput = document.createElement('input');
					testNameInput.type = 'text';
					testNameInput.id = 'testName';
					testNameInput.placeholder = '请输入测试名称';
					testNameInput.style.width = '100%';
					testNameInput.style.padding = '8px 12px';
					testNameInput.style.border = '1px solid #ddd';
					testNameInput.style.borderRadius = '4px';
					testNameInput.style.fontSize = '14px';
					
					testNameGroup.appendChild(testNameLabel);
					testNameGroup.appendChild(testNameInput);
					
					// 算法A
					const algorithmAGroup = document.createElement('div');
					algorithmAGroup.className = 'form-group';
					algorithmAGroup.style.marginBottom = '15px';
					
					const algorithmALabel = document.createElement('label');
					algorithmALabel.textContent = '算法A';
					algorithmALabel.style.display = 'block';
					algorithmALabel.style.marginBottom = '5px';
					algorithmALabel.style.fontWeight = 'bold';
					
					const algorithmAInput = document.createElement('select');
					algorithmAInput.id = 'algorithmA';
					algorithmAInput.style.width = '100%';
					algorithmAInput.style.padding = '8px 12px';
					algorithmAInput.style.border = '1px solid #ddd';
					algorithmAInput.style.borderRadius = '4px';
					algorithmAInput.style.fontSize = '14px';
					
					const algorithms = [
						{ value: 'collaborative_filtering', text: '协同过滤' },
						{ value: 'content_based', text: '基于内容' },
						{ value: 'popularity', text: '基于流行度' },
						{ value: 'hybrid', text: '混合推荐' }
					];
					
					algorithms.forEach(algo => {
						const option = document.createElement('option');
						option.value = algo.value;
						option.textContent = algo.text;
						algorithmAInput.appendChild(option);
					});
					
					algorithmAGroup.appendChild(algorithmALabel);
					algorithmAGroup.appendChild(algorithmAInput);
					
					// 算法B
					const algorithmBGroup = document.createElement('div');
					algorithmBGroup.className = 'form-group';
					algorithmBGroup.style.marginBottom = '15px';
					
					const algorithmBLabel = document.createElement('label');
					algorithmBLabel.textContent = '算法B';
					algorithmBLabel.style.display = 'block';
					algorithmBLabel.style.marginBottom = '5px';
					algorithmBLabel.style.fontWeight = 'bold';
					
					const algorithmBInput = document.createElement('select');
					algorithmBInput.id = 'algorithmB';
					algorithmBInput.style.width = '100%';
					algorithmBInput.style.padding = '8px 12px';
					algorithmBInput.style.border = '1px solid #ddd';
					algorithmBInput.style.borderRadius = '4px';
					algorithmBInput.style.fontSize = '14px';
					
					algorithms.forEach(algo => {
						const option = document.createElement('option');
						option.value = algo.value;
						option.textContent = algo.text;
						algorithmBInput.appendChild(option);
					});
					
					// 默认选择不同的算法
					algorithmBInput.selectedIndex = 1;
					
					algorithmBGroup.appendChild(algorithmBLabel);
					algorithmBGroup.appendChild(algorithmBInput);
					
					// 流量分配
					const trafficSplitGroup = document.createElement('div');
					trafficSplitGroup.className = 'form-group';
					trafficSplitGroup.style.marginBottom = '15px';
					
					const trafficSplitLabel = document.createElement('label');
					trafficSplitLabel.textContent = '流量分配（算法A %）';
					trafficSplitLabel.style.display = 'block';
					trafficSplitLabel.style.marginBottom = '5px';
					trafficSplitLabel.style.fontWeight = 'bold';
					
					const trafficSplitInput = document.createElement('input');
					trafficSplitInput.type = 'number';
					trafficSplitInput.id = 'trafficSplit';
					trafficSplitInput.min = '10';
					trafficSplitInput.max = '90';
					trafficSplitInput.value = '50';
					trafficSplitInput.style.width = '100%';
					trafficSplitInput.style.padding = '8px 12px';
					trafficSplitInput.style.border = '1px solid #ddd';
					trafficSplitInput.style.borderRadius = '4px';
					trafficSplitInput.style.fontSize = '14px';
					
					trafficSplitGroup.appendChild(trafficSplitLabel);
					trafficSplitGroup.appendChild(trafficSplitInput);
					
					// 测试描述
					const descriptionGroup = document.createElement('div');
					descriptionGroup.className = 'form-group';
					descriptionGroup.style.marginBottom = '20px';
					
					const descriptionLabel = document.createElement('label');
					descriptionLabel.textContent = '测试描述';
					descriptionLabel.style.display = 'block';
					descriptionLabel.style.marginBottom = '5px';
					descriptionLabel.style.fontWeight = 'bold';
					
					const descriptionInput = document.createElement('textarea');
					descriptionInput.id = 'testDescription';
					descriptionInput.placeholder = '请输入测试描述';
					descriptionInput.rows = '4';
					descriptionInput.style.width = '100%';
					descriptionInput.style.padding = '8px 12px';
					descriptionInput.style.border = '1px solid #ddd';
					descriptionInput.style.borderRadius = '4px';
					descriptionInput.style.fontSize = '14px';
					descriptionInput.style.resize = 'vertical';
					
					descriptionGroup.appendChild(descriptionLabel);
					descriptionGroup.appendChild(descriptionInput);
					
					// 添加所有表单元素
					form.appendChild(testNameGroup);
					form.appendChild(algorithmAGroup);
					form.appendChild(algorithmBGroup);
					form.appendChild(trafficSplitGroup);
					form.appendChild(descriptionGroup);
					
					modalBody.appendChild(form);
					
					// 模态框底部
					const modalFooter = document.createElement('div');
					modalFooter.style.display = 'flex';
					modalFooter.style.justifyContent = 'flex-end';
					modalFooter.style.gap = '10px';
					
					const cancelBtn = document.createElement('button');
					cancelBtn.type = 'button';
					cancelBtn.textContent = '取消';
					cancelBtn.className = 'btn btn-secondary';
					cancelBtn.style.padding = '8px 16px';
					cancelBtn.style.border = '1px solid #ddd';
					cancelBtn.style.borderRadius = '4px';
					cancelBtn.style.backgroundColor = '#f5f5f5';
					cancelBtn.style.color = '#333';
					cancelBtn.style.cursor = 'pointer';
					
					const confirmBtn = document.createElement('button');
					confirmBtn.type = 'button';
					confirmBtn.textContent = '创建';
					confirmBtn.className = 'btn btn-primary';
					confirmBtn.style.padding = '8px 16px';
					confirmBtn.style.border = '1px solid #007bff';
					confirmBtn.style.borderRadius = '4px';
					confirmBtn.style.backgroundColor = '#007bff';
					confirmBtn.style.color = '#fff';
					confirmBtn.style.cursor = 'pointer';
					
					modalFooter.appendChild(cancelBtn);
					modalFooter.appendChild(confirmBtn);
					
					// 组装模态框
					modalContent.appendChild(modalHeader);
					modalContent.appendChild(modalBody);
					modalContent.appendChild(modalFooter);
					modal.appendChild(modalContent);
					document.body.appendChild(modal);
					
					// 关闭模态框
						function closeAbTestModal() {
							modal.remove();
						}
						
						modalClose.addEventListener('click', closeAbTestModal);
						cancelBtn.addEventListener('click', closeAbTestModal);
						
						// 点击模态框外部关闭
						modal.addEventListener('click', (e) => {
							if (e.target === modal) {
								closeAbTestModal();
							}
						});
					
					// 提交表单
					confirmBtn.addEventListener('click', async () => {
						const testName = testNameInput.value;
						const algorithmA = algorithmAInput.value;
						const algorithmB = algorithmBInput.value;
						const trafficSplit = trafficSplitInput.value;
						const description = descriptionInput.value;
						
						// 表单验证
						if (!testName) {
							alert('请输入测试名称');
							return;
						}
						
						if (algorithmA === algorithmB) {
							alert('算法A和算法B不能相同');
							return;
						}
						
						try {
							// 显示加载状态
							confirmBtn.disabled = true;
							confirmBtn.textContent = '创建中...';
							
							// 调试信息
								test_name: testName,
								algorithm_a: algorithmA,
								algorithm_b: algorithmB,
								traffic_split: parseInt(trafficSplit),
								description: description
							});
							
							// 发送请求创建测试
							const requestData = {
								test_name: testName,
								algorithm_a: algorithmA,
								algorithm_b: algorithmB,
								traffic_split: parseInt(trafficSplit),
								description: description
							};
							
							
							const response = await fetch(API_BASE_URL + '/admin_recommendations.php', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify(requestData)
					});
							
							// 调试信息
							
							// 读取响应文本
							const responseText = await response.text();
							
							// 尝试解析JSON
							let result;
							try {
								result = JSON.parse(responseText);
							} catch (parseError) {
								console.error('解析响应JSON失败:', parseError);
								alert('创建A/B测试失败：响应格式错误');
								return;
							}
							
							if (result.code === 201) {
								alert('创建A/B测试成功！');
								closeAbTestModal();
								// 重新加载测试数据
								loadAbTestData();
							} else {
								alert('创建A/B测试失败：' + (result.message || '未知错误'));
							}
						} catch (error) {
							console.error('创建A/B测试失败:', error);
							alert('创建A/B测试失败：网络错误');
						} finally {
							// 恢复按钮状态
							confirmBtn.disabled = false;
							confirmBtn.textContent = '创建';
						}
					});
				}
			
			// 初始化管理界面
			initAbTestManager();
		</script>
	`;
	
	modalBody.innerHTML = abTestHtml;
	modal.classList.add('show');
	
	// 延迟初始化A/B测试管理，确保DOM元素已完全加载
	setTimeout(() => {
		// 绑定创建测试按钮
		const createTestBtn = document.getElementById('createTestBtn');
		if (createTestBtn) {
			createTestBtn.addEventListener('click', function() {
				// 创建新测试的模态框
				const modal = document.createElement('div');
				modal.className = 'modal show';
				modal.style.position = 'fixed';
				modal.style.top = '0';
				modal.style.left = '0';
				modal.style.width = '100%';
				modal.style.height = '100%';
				modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
				modal.style.display = 'flex';
				modal.style.justifyContent = 'center';
				modal.style.alignItems = 'center';
				modal.style.zIndex = '9999';
				
				// 模态框内容
				const modalContent = document.createElement('div');
				modalContent.className = 'modal-content';
				modalContent.style.backgroundColor = '#fff';
				modalContent.style.borderRadius = '8px';
				modalContent.style.padding = '30px';
				modalContent.style.width = '500px';
				modalContent.style.maxWidth = '90%';
				modalContent.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
				
				// 模态框标题
				const modalHeader = document.createElement('div');
				modalHeader.style.display = 'flex';
				modalHeader.style.justifyContent = 'space-between';
				modalHeader.style.alignItems = 'center';
				modalHeader.style.marginBottom = '20px';
				
				const modalTitle = document.createElement('h3');
				modalTitle.textContent = '创建新A/B测试';
				modalTitle.style.margin = '0';
				modalTitle.style.color = '#333';
				
				const modalClose = document.createElement('button');
				modalClose.textContent = '×';
				modalClose.style.background = 'none';
				modalClose.style.border = 'none';
				modalClose.style.fontSize = '24px';
				modalClose.style.cursor = 'pointer';
				modalClose.style.color = '#999';
				modalClose.style.padding = '0';
				modalClose.style.lineHeight = '1';
				
				modalHeader.appendChild(modalTitle);
				modalHeader.appendChild(modalClose);
				
				// 模态框主体
				const modalBody = document.createElement('div');
				modalBody.style.marginBottom = '20px';
				
				// 创建表单
				const form = document.createElement('form');
				form.id = 'createTestForm';
				
				// 测试名称
				const testNameGroup = document.createElement('div');
				testNameGroup.className = 'form-group';
				testNameGroup.style.marginBottom = '15px';
				
				const testNameLabel = document.createElement('label');
				testNameLabel.textContent = '测试名称';
				testNameLabel.style.display = 'block';
				testNameLabel.style.marginBottom = '5px';
				testNameLabel.style.fontWeight = 'bold';
				
				const testNameInput = document.createElement('input');
				testNameInput.type = 'text';
				testNameInput.id = 'testName';
				testNameInput.placeholder = '请输入测试名称';
				testNameInput.style.width = '100%';
				testNameInput.style.padding = '8px 12px';
				testNameInput.style.border = '1px solid #ddd';
				testNameInput.style.borderRadius = '4px';
				testNameInput.style.fontSize = '14px';
				
				testNameGroup.appendChild(testNameLabel);
				testNameGroup.appendChild(testNameInput);
				
				// 算法A
				const algorithmAGroup = document.createElement('div');
				algorithmAGroup.className = 'form-group';
				algorithmAGroup.style.marginBottom = '15px';
				
				const algorithmALabel = document.createElement('label');
				algorithmALabel.textContent = '算法A';
				algorithmALabel.style.display = 'block';
				algorithmALabel.style.marginBottom = '5px';
				algorithmALabel.style.fontWeight = 'bold';
				
				const algorithmAInput = document.createElement('select');
				algorithmAInput.id = 'algorithmA';
				algorithmAInput.style.width = '100%';
				algorithmAInput.style.padding = '8px 12px';
				algorithmAInput.style.border = '1px solid #ddd';
				algorithmAInput.style.borderRadius = '4px';
				algorithmAInput.style.fontSize = '14px';
				
				const algorithms = [
					{ value: 'collaborative_filtering', text: '协同过滤' },
					{ value: 'content_based', text: '基于内容' },
					{ value: 'popularity', text: '基于流行度' },
					{ value: 'hybrid', text: '混合推荐' }
				];
				
				algorithms.forEach(algo => {
					const option = document.createElement('option');
					option.value = algo.value;
					option.textContent = algo.text;
					algorithmAInput.appendChild(option);
				});
				
				algorithmAGroup.appendChild(algorithmALabel);
				algorithmAGroup.appendChild(algorithmAInput);
				
				// 算法B
				const algorithmBGroup = document.createElement('div');
				algorithmBGroup.className = 'form-group';
				algorithmBGroup.style.marginBottom = '15px';
				
				const algorithmBLabel = document.createElement('label');
				algorithmBLabel.textContent = '算法B';
				algorithmBLabel.style.display = 'block';
				algorithmBLabel.style.marginBottom = '5px';
				algorithmBLabel.style.fontWeight = 'bold';
				
				const algorithmBInput = document.createElement('select');
				algorithmBInput.id = 'algorithmB';
				algorithmBInput.style.width = '100%';
				algorithmBInput.style.padding = '8px 12px';
				algorithmBInput.style.border = '1px solid #ddd';
				algorithmBInput.style.borderRadius = '4px';
				algorithmBInput.style.fontSize = '14px';
				
				algorithms.forEach(algo => {
					const option = document.createElement('option');
					option.value = algo.value;
					option.textContent = algo.text;
					algorithmBInput.appendChild(option);
				});
				
				// 默认选择不同的算法
				algorithmBInput.selectedIndex = 1;
				
				algorithmBGroup.appendChild(algorithmBLabel);
				algorithmBGroup.appendChild(algorithmBInput);
				
				// 流量分配
				const trafficSplitGroup = document.createElement('div');
				trafficSplitGroup.className = 'form-group';
				trafficSplitGroup.style.marginBottom = '15px';
				
				const trafficSplitLabel = document.createElement('label');
				trafficSplitLabel.textContent = '流量分配（算法A %）';
				trafficSplitLabel.style.display = 'block';
				trafficSplitLabel.style.marginBottom = '5px';
				trafficSplitLabel.style.fontWeight = 'bold';
				
				const trafficSplitInput = document.createElement('input');
				trafficSplitInput.type = 'number';
				trafficSplitInput.id = 'trafficSplit';
				trafficSplitInput.min = '10';
				trafficSplitInput.max = '90';
				trafficSplitInput.value = '50';
				trafficSplitInput.style.width = '100%';
				trafficSplitInput.style.padding = '8px 12px';
				trafficSplitInput.style.border = '1px solid #ddd';
				trafficSplitInput.style.borderRadius = '4px';
				trafficSplitInput.style.fontSize = '14px';
				
				trafficSplitGroup.appendChild(trafficSplitLabel);
				trafficSplitGroup.appendChild(trafficSplitInput);
				
				// 测试描述
				const descriptionGroup = document.createElement('div');
				descriptionGroup.className = 'form-group';
				descriptionGroup.style.marginBottom = '20px';
				
				const descriptionLabel = document.createElement('label');
				descriptionLabel.textContent = '测试描述';
				descriptionLabel.style.display = 'block';
				descriptionLabel.style.marginBottom = '5px';
				descriptionLabel.style.fontWeight = 'bold';
				
				const descriptionInput = document.createElement('textarea');
				descriptionInput.id = 'testDescription';
				descriptionInput.placeholder = '请输入测试描述';
				descriptionInput.rows = '4';
				descriptionInput.style.width = '100%';
				descriptionInput.style.padding = '8px 12px';
				descriptionInput.style.border = '1px solid #ddd';
				descriptionInput.style.borderRadius = '4px';
				descriptionInput.style.fontSize = '14px';
				descriptionInput.style.resize = 'vertical';
				
				descriptionGroup.appendChild(descriptionLabel);
				descriptionGroup.appendChild(descriptionInput);
				
				// 添加所有表单元素
				form.appendChild(testNameGroup);
				form.appendChild(algorithmAGroup);
				form.appendChild(algorithmBGroup);
				form.appendChild(trafficSplitGroup);
				form.appendChild(descriptionGroup);
				
				modalBody.appendChild(form);
				
				// 模态框底部
				const modalFooter = document.createElement('div');
				modalFooter.style.display = 'flex';
				modalFooter.style.justifyContent = 'flex-end';
				modalFooter.style.gap = '10px';
				
				const cancelBtn = document.createElement('button');
				cancelBtn.type = 'button';
				cancelBtn.textContent = '取消';
				cancelBtn.className = 'btn btn-secondary';
				cancelBtn.style.padding = '8px 16px';
				cancelBtn.style.border = '1px solid #ddd';
				cancelBtn.style.borderRadius = '4px';
				cancelBtn.style.backgroundColor = '#f5f5f5';
				cancelBtn.style.color = '#333';
				cancelBtn.style.cursor = 'pointer';
				
				const confirmBtn = document.createElement('button');
				confirmBtn.type = 'button';
				confirmBtn.textContent = '创建';
				confirmBtn.className = 'btn btn-primary';
				confirmBtn.style.padding = '8px 16px';
				confirmBtn.style.border = '1px solid #007bff';
				confirmBtn.style.borderRadius = '4px';
				confirmBtn.style.backgroundColor = '#007bff';
				confirmBtn.style.color = '#fff';
				confirmBtn.style.cursor = 'pointer';
				
				modalFooter.appendChild(cancelBtn);
				modalFooter.appendChild(confirmBtn);
				
				// 组装模态框
				modalContent.appendChild(modalHeader);
				modalContent.appendChild(modalBody);
				modalContent.appendChild(modalFooter);
				modal.appendChild(modalContent);
				document.body.appendChild(modal);
				
				// 关闭模态框
				
				modalClose.addEventListener('click', closeAbTestModal);
				cancelBtn.addEventListener('click', closeAbTestModal);
				
				// 点击模态框外部关闭
				modal.addEventListener('click', (e) => {
					if (e.target === modal) {
						closeAbTestModal();
					}
				});
				
				// 提交表单
				confirmBtn.addEventListener('click', async () => {
					// 使用局部变量引用获取表单值
					const testName = testNameInput.value;
					const algorithmA = algorithmAInput.value;
					const algorithmB = algorithmBInput.value;
					const trafficSplit = trafficSplitInput.value;
					const description = descriptionInput.value;
					
					// 表单验证
					if (!testName) {
						alert('请输入测试名称');
						return;
					}
					
					if (algorithmA === algorithmB) {
						alert('算法A和算法B不能相同');
						return;
					}
					
					try {
						// 显示加载状态
						confirmBtn.disabled = true;
						confirmBtn.textContent = '创建中...';
						
						// 发送请求创建测试
						const response = await fetch(`${API_BASE_URL}/admin_recommendations.php`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							test_name: testName,
							algorithm_a: algorithmA,
							algorithm_b: algorithmB,
							traffic_split: parseInt(trafficSplit),
							description: description
						})
					});
						
						const result = await response.json();
						if (result.code === 201) {
							alert('创建A/B测试成功！');
							closeAbTestModal();
							// 重新加载测试数据
							loadAbTestData();
						} else {
							alert('创建A/B测试失败：' + (result.message || '未知错误'));
						}
					} catch (error) {
						console.error('创建A/B测试失败:', error);
						alert('创建A/B测试失败：网络错误');
					} finally {
						// 恢复按钮状态
						confirmBtn.disabled = false;
						confirmBtn.textContent = '创建';
					}
				});
			});
		}
		
		// 加载A/B测试数据
		loadAbTestData();
	}, 100);
}

// 加载A/B测试数据

// 更新测试统计

// 显示A/B测试详情
function showAbTestDetail(testId) {
	
	// 创建详情模态框
	const modal = document.createElement('div');
	modal.className = 'modal show';
	modal.style.position = 'fixed';
	modal.style.top = '0';
	modal.style.left = '0';
	modal.style.width = '100%';
	modal.style.height = '100%';
	modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
	modal.style.display = 'flex';
	modal.style.justifyContent = 'center';
	modal.style.alignItems = 'center';
	modal.style.zIndex = '9999';
	
	// 模态框内容
	const modalContent = document.createElement('div');
	modalContent.className = 'modal-content';
	modalContent.style.backgroundColor = '#fff';
	modalContent.style.borderRadius = '8px';
	modalContent.style.padding = '30px';
	modalContent.style.width = '800px';
	modalContent.style.maxWidth = '90%';
	modalContent.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
	
	// 模态框标题
	const modalHeader = document.createElement('div');
	modalHeader.style.display = 'flex';
	modalHeader.style.justifyContent = 'space-between';
	modalHeader.style.alignItems = 'center';
	modalHeader.style.marginBottom = '20px';
	
	const modalTitle = document.createElement('h3');
	modalTitle.textContent = 'A/B测试详情';
	modalTitle.style.margin = '0';
	modalTitle.style.color = '#333';
	
	const modalClose = document.createElement('button');
	modalClose.textContent = '×';
	modalClose.style.background = 'none';
	modalClose.style.border = 'none';
	modalClose.style.fontSize = '24px';
	modalClose.style.cursor = 'pointer';
	modalClose.style.color = '#999';
	modalClose.style.padding = '0';
	modalClose.style.lineHeight = '1';
	
	modalHeader.appendChild(modalTitle);
	modalHeader.appendChild(modalClose);
	
	// 模态框主体
	const modalBody = document.createElement('div');
	modalBody.style.marginBottom = '20px';
	
	// 加载测试详情
	modalBody.innerHTML = '<div style="text-align: center; padding: 20px;"><div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #007bff; border-radius: 50%; border-top-color: transparent; animation: spin 1s linear infinite;"></div><p style="margin-top: 10px;">加载中...</p></div>';
	
	// 添加CSS动画
	const style = document.createElement('style');
	style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
	document.head.appendChild(style);
	
	// 模态框底部
	const modalFooter = document.createElement('div');
	modalFooter.style.display = 'flex';
	modalFooter.style.justifyContent = 'flex-end';
	modalFooter.style.gap = '10px';
	
	const closeBtn = document.createElement('button');
	closeBtn.type = 'button';
	closeBtn.textContent = '关闭';
	closeBtn.className = 'btn btn-secondary';
	closeBtn.style.padding = '8px 16px';
	closeBtn.style.border = '1px solid #ddd';
	closeBtn.style.borderRadius = '4px';
	closeBtn.style.backgroundColor = '#f5f5f5';
	closeBtn.style.color = '#333';
	closeBtn.style.cursor = 'pointer';
	
	modalFooter.appendChild(closeBtn);
	
	// 组装模态框
	modalContent.appendChild(modalHeader);
	modalContent.appendChild(modalBody);
	modalContent.appendChild(modalFooter);
	modal.appendChild(modalContent);
	document.body.appendChild(modal);
	
	// 关闭模态框
	
	modalClose.addEventListener('click', closeModal);
	closeBtn.addEventListener('click', closeModal);
	
	// 点击模态框外部关闭
	modal.addEventListener('click', (e) => {
		if (e.target === modal) {
			closeModal();
		}
	});
	
	// 加载测试详情数据
	fetch(`${API_BASE_URL}/admin_recommendations.php?action=ab_test_detail&id=${testId}`, {
		method: 'GET',
		credentials: 'include'
	})
	.then(response => response.text())
	.then(responseText => {

		// 检查响应是否为空
		if (!responseText || responseText.trim() === '') {
			console.error('服务器返回空响应');
			// 显示错误信息
			const detailModalContent = document.getElementById('abTestDetailContent');
			if (detailModalContent) {
				detailModalContent.innerHTML = `
					<div class="error-message">
						<p>无法加载测试详情，服务器返回空响应</p>
						<button onclick="closeAbTestDetailModal()" class="btn btn-primary">关闭</button>
					</div>
				`;
			}
			return;
		}

		// 尝试解析JSON
		let result;
		try {
			// 清理响应文本，移除前后空白字符
			const cleanedResponseText = responseText.trim();
			
			// 尝试找到JSON的开始和结束位置
			const jsonStart = cleanedResponseText.indexOf('{');
			const jsonEnd = cleanedResponseText.lastIndexOf('}');
			
			if (jsonStart !== -1 && jsonEnd !== -1) {
				// 提取有效的JSON部分
				const jsonPart = cleanedResponseText.substring(jsonStart, jsonEnd + 1);
				result = JSON.parse(jsonPart);
			} else {
				// 尝试直接解析
				result = JSON.parse(cleanedResponseText);
			}
		} catch (parseError) {
			console.error('JSON解析错误:', parseError);
			console.error('完整响应文本:', responseText);
			// 显示错误信息
			const detailModalContent = document.getElementById('abTestDetailContent');
			if (detailModalContent) {
				detailModalContent.innerHTML = `
					<div class="error-message">
						<p>无法加载测试详情，数据格式错误</p>
						<p class="error-detail">错误信息: ${parseError.message}</p>
						<p class="error-detail">响应长度: ${responseText.length} 字符</p>
						<button onclick="closeAbTestDetailModal()" class="btn btn-primary">关闭</button>
					</div>
				`;
			}
			return;
		}

		if (result.code === 200) {
			const test = result.data;
			const algorithmNames = {
				'collaborative_filtering': '协同过滤',
				'content_based': '基于内容',
				'popularity': '基于流行度',
				'hybrid': '混合推荐'
			};
			
			// 构建详情内容
			let detailHtml = `
				<div class="ab-test-detail">
					<div class="detail-section">
						<h4>基本信息</h4>
						<div class="detail-grid">
							<div class="detail-item">
								<span class="detail-label">测试名称:</span>
								<span class="detail-value">${test.test_name}</span>
							</div>
							<div class="detail-item">
								<span class="detail-label">算法A:</span>
								<span class="detail-value">${algorithmNames[test.algorithm_a] || test.algorithm_a}</span>
							</div>
							<div class="detail-item">
								<span class="detail-label">算法B:</span>
								<span class="detail-value">${algorithmNames[test.algorithm_b] || test.algorithm_b}</span>
							</div>
							<div class="detail-item">
								<span class="detail-label">状态:</span>
								<span class="detail-value status-badge ${test.status === 'running' ? 'status-active' : 'status-completed'}">${test.status === 'running' ? '运行中' : '已完成'}</span>
							</div>
							<div class="detail-item">
								<span class="detail-label">开始时间:</span>
								<span class="detail-value">${test.start_time}</span>
							</div>
							<div class="detail-item">
								<span class="detail-label">结束时间:</span>
								<span class="detail-value">${test.end_time || '未结束'}</span>
							</div>
							<div class="detail-item">
								<span class="detail-label">流量分配:</span>
								<span class="detail-value">算法A: ${test.traffic_split}%, 算法B: ${100 - test.traffic_split}%</span>
							</div>
							<div class="detail-item">
								<span class="detail-label">描述:</span>
								<span class="detail-value">${test.description || '无'}</span>
							</div>
						</div>
					</div>
				`;
			
			// 添加测试结果
			if (test.results && test.results.length > 0) {
				detailHtml += `
					<div class="detail-section">
						<h4>测试结果</h4>
						<div class="result-table">
							<table>
								<thead>
									<tr>
										<th>算法</th>
										<th>展示次数</th>
										<th>点击次数</th>
										<th>点击率</th>
										<th>转化率</th>
									</tr>
								</thead>
								<tbody>
							`;
				
				test.results.forEach(result => {
							detailHtml += `
									<tr>
										<td>${algorithmNames[result.algorithm] || result.algorithm}</td>
										<td>${result.shows || 0}</td>
										<td>${result.clicks || 0}</td>
										<td>${result.shows > 0 ? ((result.ctr || 0) * 100).toFixed(2) + '%' : '暂无数据'}</td>
										<td>${result.shows > 0 ? ((result.conversion_rate || 0) * 100).toFixed(2) + '%' : '暂无数据'}</td>
									</tr>
									`;
							});
				
				detailHtml += `
								</tbody>
							</table>
						</div>
					</div>
				`;
			}
			
			// 添加样式
			detailHtml += `
				<style>
					.ab-test-detail {
						font-size: 14px;
					}
					.detail-section {
						margin-bottom: 20px;
						padding-bottom: 15px;
						border-bottom: 1px solid #e0e0e0;
					}
					.detail-section h4 {
						margin-top: 0;
						margin-bottom: 10px;
						color: #333;
					}
					.detail-grid {
						display: grid;
						grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
						gap: 10px;
					}
					.detail-item {
						display: flex;
						align-items: center;
						gap: 10px;
					}
					.detail-label {
						font-weight: bold;
						color: #666;
						min-width: 80px;
					}
					.detail-value {
						color: #333;
					}
					.status-badge {
						display: inline-block;
						padding: 4px 12px;
						border-radius: 12px;
						font-size: 12px;
						font-weight: bold;
					}
					.status-active {
						background-color: #d4edda;
						color: #155724;
					}
					.status-completed {
						background-color: #d1ecf1;
						color: #0c5460;
					}
					.result-table {
						width: 100%;
						overflow-x: auto;
					}
					.result-table table {
						width: 100%;
						border-collapse: collapse;
					}
					.result-table th,
					.result-table td {
						padding: 8px 12px;
						text-align: left;
						border-bottom: 1px solid #e0e0e0;
					}
					.result-table th {
						background-color: #f8f9fa;
						font-weight: bold;
					}
					.result-table tr:hover {
						background-color: #f8f9fa;
					}
				</style>
			`;
			
			modalBody.innerHTML = detailHtml;
		} else {
			modalBody.innerHTML = `<div style="color: red; text-align: center; padding: 20px;">加载测试详情失败: ${result.message || '未知错误'}</div>`;
		}
	})
	.catch(error => {
		console.error('加载测试详情失败:', error);
		modalBody.innerHTML = '<div style="color: red; text-align: center; padding: 20px;">加载测试详情失败: 网络错误</div>';
	});
}

// 停止A/B测试
function stopAbTest(testId) {
	if (!confirm('确定要停止这个A/B测试吗？')) {
		return;
	}
	
	// 发送请求停止测试
	fetch(`${API_BASE_URL}/admin_recommendations.php?action=stop_ab_test`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ test_id: testId })
	})
	.then(response => response.text())
	.then(responseText => {

		// 检查响应是否为空
		if (!responseText || responseText.trim() === '') {
			console.error('服务器返回空响应');
			alert('停止A/B测试失败：服务器返回空响应');
			return;
		}

		// 尝试解析JSON
		let result;
		try {
			result = JSON.parse(responseText);
		} catch (parseError) {
			console.error('JSON解析错误:', parseError);
			alert('停止A/B测试失败：数据格式错误');
			return;
		}

		if (result.code === 200) {
			alert('停止A/B测试成功！');
			// 重新加载测试数据
			loadAbTestData();
		} else {
			alert('停止A/B测试失败：' + (result.message || '未知错误'));
		}
	})
	.catch(error => {
		console.error('停止A/B测试失败:', error);
		alert('停止A/B测试失败：网络错误');
	});
}

// 更新测试表格

function showToast(message, type = 'error') {
	const toast = document.createElement('div');
	toast.className = 'toast';
	toast.textContent = message;
	toast.style.position = 'fixed';
	toast.style.top = '20px';
	toast.style.left = '50%';
	toast.style.transform = 'translateX(-50%)';
	toast.style.padding = '12px 24px';
	toast.style.backgroundColor = type === 'success' ? '#67c23a' : '#f56c6c';
	toast.style.color = '#ffffff';
	toast.style.borderRadius = '4px';
	toast.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.1)';
	toast.style.zIndex = '9999';
	toast.style.animation = 'slideDown 0.3s ease';

	document.body.appendChild(toast);

	setTimeout(() => {
		toast.remove();
	}, 3000);
}

// 显示加载指示器
function showLoading() {
	isLoading = true;
	let loadingElement = document.getElementById('loadingIndicator');
	if (!loadingElement) {
		loadingElement = document.createElement('div');
		loadingElement.id = 'loadingIndicator';
		loadingElement.className = 'loading-indicator';
		loadingElement.innerHTML = `
			<div class="loading-spinner"></div>
			<div class="loading-text">加载中...</div>
		`;
		loadingElement.style.position = 'fixed';
		loadingElement.style.top = '0';
		loadingElement.style.left = '0';
		loadingElement.style.width = '100%';
		loadingElement.style.height = '100%';
		loadingElement.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
		loadingElement.style.display = 'flex';
		loadingElement.style.flexDirection = 'column';
		loadingElement.style.justifyContent = 'center';
		loadingElement.style.alignItems = 'center';
		loadingElement.style.zIndex = '9999';
		loadingElement.style.backdropFilter = 'blur(2px)';
		
		// 添加加载动画样式
		const style = document.createElement('style');
		style.textContent = `
			@keyframes spin {
				0% { transform: rotate(0deg); }
				100% { transform: rotate(360deg); }
			}
			.loading-spinner {
				width: 40px;
				height: 40px;
				border: 4px solid #f3f3f3;
				border-top: 4px solid #3498db;
				border-radius: 50%;
				animation: spin 1s linear infinite;
				margin-bottom: 10px;
			}
			.loading-text {
				font-size: 16px;
				color: #333;
			}
		`;
		document.head.appendChild(style);
		document.body.appendChild(loadingElement);
	} else {
		loadingElement.style.display = 'flex';
	}
}

// 隐藏加载指示器
function hideLoading() {
	isLoading = false;
	const loadingElement = document.getElementById('loadingIndicator');
	if (loadingElement) {
		loadingElement.style.display = 'none';
	}
}

// 初始化侧边栏
function initSidebar() {
	// 检查本地存储中的侧边栏状态
	const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
	if (isCollapsed) {
		toggleSidebar();
	}
	
	// 绑定侧边栏切换事件
	const sidebarToggle = document.getElementById('sidebarToggle');
	if (sidebarToggle) {
		sidebarToggle.addEventListener('click', toggleSidebar);
	}
}

// 切换侧边栏状态
function toggleSidebar() {
	const sidebar = document.getElementById('sidebar');
	const mainContent = document.querySelector('.main-content');
	const sidebarToggle = document.getElementById('sidebarToggle');
	const toggleIcon = sidebarToggle.querySelector('.toggle-icon');
	
	if (sidebar && mainContent) {
		// 切换侧边栏和主内容的类
		sidebar.classList.toggle('collapsed');
		mainContent.classList.toggle('collapsed');
		
		// 更新切换按钮图标
		if (sidebar.classList.contains('collapsed')) {
			toggleIcon.textContent = '≡';
			localStorage.setItem('sidebarCollapsed', 'true');
		} else {
			toggleIcon.textContent = '☰';
			localStorage.setItem('sidebarCollapsed', 'false');
		}
	}
}

// 修改init函数，添加侧边栏初始化

// 显示手动推荐模态框
function showManualRecommendation() {
	// 实现手动推荐功能
	// 创建模态框
	const modal = document.createElement('div');
	modal.className = 'modal';
	modal.style.position = 'fixed';
	modal.style.top = '0';
	modal.style.left = '0';
	modal.style.width = '100%';
	modal.style.height = '100%';
	modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
	modal.style.display = 'flex';
	modal.style.alignItems = 'center';
	modal.style.justifyContent = 'center';
	modal.style.zIndex = '1000';
	
	// 创建模态框内容
	const modalContent = document.createElement('div');
	modalContent.className = 'modal-content';
	modalContent.style.backgroundColor = '#fff';
	modalContent.style.padding = '30px';
	modalContent.style.borderRadius = '10px';
	modalContent.style.width = '90%';
	modalContent.style.maxWidth = '800px';
	modalContent.style.maxHeight = '80vh';
	modalContent.style.overflowY = 'auto';
	
	// 模态框标题
	const modalHeader = document.createElement('div');
	modalHeader.className = 'modal-header';
	modalHeader.style.marginBottom = '20px';
	modalHeader.style.borderBottom = '1px solid #e0e0e0';
	modalHeader.style.paddingBottom = '15px';
	
	const modalTitle = document.createElement('h2');
	modalTitle.textContent = '手动推荐管理';
	modalTitle.style.margin = '0';
	modalTitle.style.fontSize = '24px';
	modalTitle.style.color = '#333';
	modalHeader.appendChild(modalTitle);
	
	const modalClose = document.createElement('button');
	modalClose.className = 'modal-close';
	modalClose.textContent = '×';
	modalClose.style.position = 'absolute';
	modalClose.style.top = '15px';
	modalClose.style.right = '20px';
	modalClose.style.fontSize = '24px';
	modalClose.style.border = 'none';
	modalClose.style.background = 'none';
	modalClose.style.cursor = 'pointer';
	modalClose.style.color = '#999';
	modalClose.addEventListener('click', () => {
		modal.remove();
	});
	modalHeader.appendChild(modalClose);
	modalContent.appendChild(modalHeader);
	
	// 模态框体
	const modalBody = document.createElement('div');
	modalBody.className = 'modal-body';
	
	// 创建手动推荐表单
	const form = document.createElement('form');
	
	// 推荐类型
	const recommendTypeGroup = document.createElement('div');
	recommendTypeGroup.className = 'form-group';
	recommendTypeGroup.style.marginBottom = '20px';
	
	const recommendTypeLabel = document.createElement('label');
	recommendTypeLabel.textContent = '推荐类型';
	recommendTypeLabel.style.display = 'block';
	recommendTypeLabel.style.marginBottom = '5px';
	recommendTypeLabel.style.fontWeight = 'bold';
	recommendTypeLabel.style.color = '#333';
	
	const recommendTypeSelect = document.createElement('select');
	recommendTypeSelect.id = 'recommendType';
	recommendTypeSelect.style.width = '100%';
	recommendTypeSelect.style.padding = '10px 15px';
	recommendTypeSelect.style.border = '1px solid #ddd';
	recommendTypeSelect.style.borderRadius = '6px';
	recommendTypeSelect.style.fontSize = '16px';
	recommendTypeSelect.style.backgroundColor = '#fff';
	
	const recommendTypeOptions = [
		{ value: 'all', text: '推荐给所有用户' },
		{ value: 'specific', text: '推荐给特定用户' },
		{ value: 'segment', text: '推荐给用户群体' }
	];
	
	recommendTypeOptions.forEach(option => {
		const opt = document.createElement('option');
		opt.value = option.value;
		opt.textContent = option.text;
		recommendTypeSelect.appendChild(opt);
	});
	
	recommendTypeGroup.appendChild(recommendTypeLabel);
	recommendTypeGroup.appendChild(recommendTypeSelect);
	
	// 特定用户ID（当选择推荐给特定用户时显示）
	const userIdGroup = document.createElement('div');
	userIdGroup.className = 'form-group';
	userIdGroup.style.marginBottom = '20px';
	userIdGroup.style.display = 'none';
	
	const userIdLabel = document.createElement('label');
	userIdLabel.textContent = '用户ID';
	userIdLabel.style.display = 'block';
	userIdLabel.style.marginBottom = '5px';
	userIdLabel.style.fontWeight = 'bold';
	userIdLabel.style.color = '#333';
	
	const userIdInput = document.createElement('input');
	userIdInput.type = 'number';
	userIdInput.id = 'userId';
	userIdInput.placeholder = '请输入用户ID';
	userIdInput.style.width = '100%';
	userIdInput.style.padding = '10px 15px';
	userIdInput.style.border = '1px solid #ddd';
	userIdInput.style.borderRadius = '6px';
	userIdInput.style.fontSize = '16px';
	
	userIdGroup.appendChild(userIdLabel);
	userIdGroup.appendChild(userIdInput);
	
	// 内容选择
	const contentGroup = document.createElement('div');
	contentGroup.className = 'form-group';
	contentGroup.style.marginBottom = '20px';
	
	const contentLabel = document.createElement('label');
	contentLabel.textContent = '选择推荐内容';
	contentLabel.style.display = 'block';
	contentLabel.style.marginBottom = '5px';
	contentLabel.style.fontWeight = 'bold';
	contentLabel.style.color = '#333';
	
	const contentSelect = document.createElement('select');
	contentSelect.id = 'contentSelect';
	contentSelect.style.width = '100%';
	contentSelect.style.padding = '10px 15px';
	contentSelect.style.border = '1px solid #ddd';
	contentSelect.style.borderRadius = '6px';
	contentSelect.style.fontSize = '16px';
	contentSelect.style.backgroundColor = '#fff';
	contentSelect.style.maxHeight = '300px';
	contentSelect.style.overflowY = 'auto';
	
	// 添加默认选项
	const defaultOption = document.createElement('option');
	defaultOption.value = '';
	defaultOption.textContent = '请选择内容';
	contentSelect.appendChild(defaultOption);
	
	// 加载内容列表
	loadContentList(contentSelect);
	
	contentGroup.appendChild(contentLabel);
	contentGroup.appendChild(contentSelect);
	
	// 推荐优先级
	const priorityGroup = document.createElement('div');
	priorityGroup.className = 'form-group';
	priorityGroup.style.marginBottom = '20px';
	
	const priorityLabel = document.createElement('label');
	priorityLabel.textContent = '推荐优先级';
	priorityLabel.style.display = 'block';
	priorityLabel.style.marginBottom = '5px';
	priorityLabel.style.fontWeight = 'bold';
	priorityLabel.style.color = '#333';
	
	const prioritySelect = document.createElement('select');
	prioritySelect.id = 'priority';
	prioritySelect.style.width = '100%';
	prioritySelect.style.padding = '10px 15px';
	prioritySelect.style.border = '1px solid #ddd';
	prioritySelect.style.borderRadius = '6px';
	prioritySelect.style.fontSize = '16px';
	prioritySelect.style.backgroundColor = '#fff';
	
	const priorityOptions = [
		{ value: 'high', text: '高优先级' },
		{ value: 'medium', text: '中优先级' },
		{ value: 'low', text: '低优先级' }
	];
	
	priorityOptions.forEach(option => {
		const opt = document.createElement('option');
		opt.value = option.value;
		opt.textContent = option.text;
		prioritySelect.appendChild(opt);
	});
	prioritySelect.value = 'medium';
	
	priorityGroup.appendChild(priorityLabel);
	priorityGroup.appendChild(prioritySelect);
	
	// 推荐过期时间
	const expireGroup = document.createElement('div');
	expireGroup.className = 'form-group';
	expireGroup.style.marginBottom = '20px';
	
	const expireLabel = document.createElement('label');
	expireLabel.textContent = '推荐过期时间';
	expireLabel.style.display = 'block';
	expireLabel.style.marginBottom = '5px';
	expireLabel.style.fontWeight = 'bold';
	expireLabel.style.color = '#333';
	
	const expireInput = document.createElement('input');
	expireInput.type = 'datetime-local';
	expireInput.id = 'expireTime';
	expireInput.style.width = '100%';
	expireInput.style.padding = '10px 15px';
	expireInput.style.border = '1px solid #ddd';
	expireInput.style.borderRadius = '6px';
	expireInput.style.fontSize = '16px';
	
	// 设置默认过期时间为7天后
	const defaultExpire = new Date();
	defaultExpire.setDate(defaultExpire.getDate() + 7);
	expireInput.value = defaultExpire.toISOString().slice(0, 16);
	
	expireGroup.appendChild(expireLabel);
	expireGroup.appendChild(expireInput);
	
	// 推荐理由
	const reasonGroup = document.createElement('div');
	reasonGroup.className = 'form-group';
	reasonGroup.style.marginBottom = '20px';
	
	const reasonLabel = document.createElement('label');
	reasonLabel.textContent = '推荐理由';
	reasonLabel.style.display = 'block';
	reasonLabel.style.marginBottom = '5px';
	reasonLabel.style.fontWeight = 'bold';
	reasonLabel.style.color = '#333';
	
	const reasonInput = document.createElement('textarea');
	reasonInput.id = 'recommendReason';
	reasonInput.placeholder = '请输入推荐理由（可选）';
	reasonInput.rows = '4';
	reasonInput.style.width = '100%';
	reasonInput.style.padding = '10px 15px';
	reasonInput.style.border = '1px solid #ddd';
	reasonInput.style.borderRadius = '6px';
	reasonInput.style.fontSize = '16px';
	reasonInput.style.resize = 'vertical';
	reasonInput.style.fontFamily = 'inherit';
	
	reasonGroup.appendChild(reasonLabel);
	reasonGroup.appendChild(reasonInput);
	
	// 添加所有表单元素
	form.appendChild(recommendTypeGroup);
	form.appendChild(userIdGroup);
	form.appendChild(contentGroup);
	form.appendChild(priorityGroup);
	form.appendChild(expireGroup);
	form.appendChild(reasonGroup);
	
	modalBody.appendChild(form);
	
	// 模态框底部
	const modalFooter = document.createElement('div');
	modalFooter.style.display = 'flex';
	modalFooter.style.justifyContent = 'flex-end';
	modalFooter.style.gap = '15px';
	modalFooter.style.marginTop = '30px';
	modalFooter.style.paddingTop = '20px';
	modalFooter.style.borderTop = '1px solid #e0e0e0';
	
	const cancelBtn = document.createElement('button');
	cancelBtn.type = 'button';
	cancelBtn.textContent = '取消';
	cancelBtn.className = 'btn btn-secondary';
	cancelBtn.style.padding = '12px 24px';
	cancelBtn.style.border = '1px solid #ddd';
	cancelBtn.style.borderRadius = '6px';
	cancelBtn.style.backgroundColor = '#f8f9fa';
	cancelBtn.style.color = '#333';
	cancelBtn.style.fontSize = '16px';
	cancelBtn.style.cursor = 'pointer';
	cancelBtn.style.transition = 'all 0.3s ease';
	
	cancelBtn.addEventListener('mouseover', () => {
		cancelBtn.style.backgroundColor = '#e9ecef';
	});
	
	cancelBtn.addEventListener('mouseout', () => {
		cancelBtn.style.backgroundColor = '#f8f9fa';
	});
	
	const confirmBtn = document.createElement('button');
	confirmBtn.type = 'button';
	confirmBtn.textContent = '保存推荐';
	confirmBtn.className = 'btn btn-success';
	confirmBtn.style.padding = '12px 30px';
	confirmBtn.style.border = '1px solid #28a745';
	confirmBtn.style.borderRadius = '6px';
	confirmBtn.style.backgroundColor = '#28a745';
	confirmBtn.style.color = '#fff';
	confirmBtn.style.fontSize = '16px';
	confirmBtn.style.cursor = 'pointer';
	confirmBtn.style.transition = 'all 0.3s ease';
	
	confirmBtn.addEventListener('mouseover', () => {
		confirmBtn.style.backgroundColor = '#218838';
	});
	
	confirmBtn.addEventListener('mouseout', () => {
		confirmBtn.style.backgroundColor = '#28a745';
	});
	
	modalFooter.appendChild(cancelBtn);
	modalFooter.appendChild(confirmBtn);
	
	// 组装模态框
	modalContent.appendChild(modalBody);
	modalContent.appendChild(modalFooter);
	modal.appendChild(modalContent);
	document.body.appendChild(modal);
	
	// 推荐类型选择事件
	recommendTypeSelect.addEventListener('change', () => {
		if (recommendTypeSelect.value === 'specific') {
			userIdGroup.style.display = 'block';
		} else {
			userIdGroup.style.display = 'none';
		}
	});
	
	// 关闭模态框
	function closeManualRecommendModal() {
		modal.remove();
	}
	
	modalClose.addEventListener('click', closeManualRecommendModal);
	cancelBtn.addEventListener('click', closeManualRecommendModal);
	
	// 点击模态框外部关闭
	modal.addEventListener('click', (e) => {
		if (e.target === modal) {
			closeManualRecommendModal();
		}
	});
	
	// 提交表单
	confirmBtn.addEventListener('click', async () => {
		const recommendType = document.getElementById('recommendType').value;
		const userId = document.getElementById('userId').value;
		const contentId = document.getElementById('contentSelect').value;
		const priority = document.getElementById('priority').value;
		const expireTime = document.getElementById('expireTime').value;
		const reason = document.getElementById('recommendReason').value;
		
		// 表单验证
		if (!recommendType) {
			alert('请选择推荐类型');
			return;
		}
		
		if (recommendType === 'specific' && !userId) {
			alert('请输入用户ID');
			return;
		}
		
		if (!contentId) {
			alert('请选择推荐内容');
			return;
		}
		
		if (!expireTime) {
			alert('请设置过期时间');
			return;
		}
		
		confirmBtn.disabled = true;
		confirmBtn.textContent = '保存中...';
		
		try {
			const response = await fetch(`${API_BASE_URL}/admin_recommendations.php?action=manual_recommend`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					recommend_type: recommendType,
					user_id: recommendType === 'specific' ? userId : null,
					content_id: contentId,
					priority: priority,
					expire_time: expireTime,
					reason: reason
				})
			});
			
			// 尝试读取响应文本
			const responseText = await response.text();

			// 检查响应是否为空
			if (!responseText || responseText.trim() === '') {
				console.error('服务器返回空响应');
				alert('设置失败: 服务器返回空响应');
				return;
			}

			// 尝试解析JSON
			let result;
			try {
				result = JSON.parse(responseText);
			} catch (parseError) {
				console.error('JSON解析错误:', parseError);
				alert('设置失败: 数据格式错误');
				return;
			}

			if (result.code === 201) {
				alert('手动推荐设置成功！');
				closeModal();
				// 刷新推荐管理页面
				loadData();
			} else {
				alert('设置失败: ' + (result.message || '未知错误'));
			}
		} catch (error) {
			console.error('设置手动推荐错误:', error);
			alert('网络错误，请稍后重试');
		} finally {
			confirmBtn.disabled = false;
			confirmBtn.textContent = '保存推荐';
		}
	});
}

// 加载内容列表
async function loadContentList(selectElement) {
	try {
		const response = await fetch(`${API_BASE_URL}/admin_content.php`);
		
		// 尝试读取响应文本
		const responseText = await response.text();

		// 检查响应是否为空
		if (!responseText || responseText.trim() === '') {
			console.error('服务器返回空响应');
			return;
		}

		// 尝试解析JSON
		let result;
		try {
			result = JSON.parse(responseText);
		} catch (parseError) {
			console.error('JSON解析错误:', parseError);
			return;
		}
		
		if (result.code === 200 && Array.isArray(result.data)) {
			// 清空现有选项（保留默认选项）
			while (selectElement.options.length > 1) {
				selectElement.remove(1);
			}
			
			// 添加内容选项
			result.data.forEach(content => {
				const option = document.createElement('option');
				option.value = content.id;
				option.textContent = `${content.title} (ID: ${content.id}, 作者: ${content.username || '未知'})`;
				selectElement.appendChild(option);
			});
		}
	} catch (error) {
		console.error('加载内容列表错误:', error);
	}
}

document.addEventListener('DOMContentLoaded', init);

// 测试A/B测试创建功能的函数
function testCreateAbTest() {
    const testData = {
        test_name: '测试A/B测试',
        algorithm_a: 'hybrid',
        algorithm_b: 'collaborative_filtering',
        traffic_split: 50,
        description: '测试混合推荐和协同过滤的性能'
    };
    
    
    fetch(`${API_BASE_URL}/admin_recommendations.php`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
    })
    .then(response => {
        return response.text();
    })
    .then(responseText => {
        try {
            const result = JSON.parse(responseText);
        } catch (error) {
            console.error('解析JSON失败:', error);
        }
    })
    .catch(error => {
        console.error('请求失败:', error);
    });
}