const API_BASE_URL = 'http://139.196.185.197:7070/doo/server/api';

const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const toast = document.getElementById('toast');

function showToast(message, type = 'error') {
	toast.textContent = message;
	toast.style.backgroundColor = type === 'success' ? '#67c23a' : '#f56c6c';
	toast.classList.add('show');
	
	setTimeout(() => {
		toast.classList.remove('show');
	}, 3000);
}

async function handleLogin() {
	const username = usernameInput.value.trim();
	const password = passwordInput.value.trim();

	if (!username || !password) {
		showToast('请输入用户名和密码');
		return;
	}

	loginBtn.disabled = true;
	loginBtn.textContent = '登录中...';

	try {
		const response = await fetch(`${API_BASE_URL}/admin_login.php`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				username: username,
				password: password
			})
		});

		const result = await response.json();

		if (result.code === 200) {
			showToast('登录成功', 'success');
			localStorage.setItem('adminInfo', JSON.stringify(result.data));
			setTimeout(() => {
				window.location.href = 'index.html';
			}, 1000);
		} else {
			showToast(result.message || '登录失败');
		}
	} catch (error) {
		console.error('登录错误:', error);
		showToast('网络错误，请稍后重试');
	} finally {
		loginBtn.disabled = false;
		loginBtn.textContent = '登录';
	}
}

loginBtn.addEventListener('click', handleLogin);

usernameInput.addEventListener('keypress', (e) => {
	if (e.key === 'Enter') {
		passwordInput.focus();
	}
});

passwordInput.addEventListener('keypress', (e) => {
	if (e.key === 'Enter') {
		handleLogin();
	}
});