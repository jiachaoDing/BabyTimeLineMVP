/**
 * 基础 API 请求封装
 */
const API_BASE = '/api';

/**
 * 通用请求方法
 * @param {string} endpoint - API 路径
 * @param {object} options - Fetch 选项
 */
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('family_token');
    const headers = {
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
        });

        if (response.status === 401) {
            // Token 失效，清理并跳转
            localStorage.removeItem('family_token');
            window.location.href = 'login.html';
            return null;
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `请求失败: ${response.status}`);
        }

        // 如果是 GET 且返回的是流（用于媒体代理可能直接用 URL，所以这里通常处理 JSON）
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        
        return response;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

/**
 * 获取带 Token 的媒体 URL
 * @param {string} r2Key - R2 中的键名
 */
function getMediaUrl(r2Key) {
    const token = localStorage.getItem('family_token');
    return `${API_BASE}/media/${r2Key}?token=${encodeURIComponent(token)}`;
}
