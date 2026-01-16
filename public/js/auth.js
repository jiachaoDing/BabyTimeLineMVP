/**
 * 身份验证相关逻辑
 */

/**
 * 检查当前是否已登录，未登录则跳转
 */
function checkAuthAndRedirect() {
    const token = localStorage.getItem('family_token');
    const path = window.location.pathname;
    // 兼容 /login, /login.html, /login/ 等情况
    const isLoginPage = path.includes('login');

    if (!token && !isLoginPage) {
        window.location.href = 'login.html';
        return false;
    }
    
    if (token && isLoginPage) {
        window.location.href = 'timeline.html';
        return true;
    }

    return !!token;
}

/**
 * 登录请求
 * @param {string} password 
 */
async function login(password) {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('family_token', data.token);
            return true;
        }
        
        const errorData = await response.json();
        throw new Error(errorData.error || '登录失败');
    } catch (e) {
        console.error('Login failed:', e);
        throw e;
    }
}

/**
 * 登出
 */
function logout() {
    localStorage.removeItem('family_token');
    window.location.href = 'login.html';
}

// 导出或全局可用
window.checkAuthAndRedirect = checkAuthAndRedirect;
window.login = login;
window.logout = logout;
