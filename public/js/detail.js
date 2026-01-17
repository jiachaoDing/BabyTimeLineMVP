/**
 * detail.js - 日记详情页逻辑
 */

let currentEntry = null;
let currentStyle = 0; // 0: 简约粉, 1: 复古黄, 2: 清新蓝

const styles = [
    { name: '简约粉', decorator: 'bg-gradient-to-r from-baby-pink to-rose-300', iconBg: 'bg-baby-pink/10', textAccent: 'text-baby-pink-deep' },
    { name: '复古黄', decorator: 'bg-gradient-to-r from-amber-200 to-yellow-400', iconBg: 'bg-amber-100', textAccent: 'text-amber-600' },
    { name: '清新蓝', decorator: 'bg-gradient-to-r from-blue-200 to-indigo-300', iconBg: 'bg-blue-50', textAccent: 'text-blue-500' }
];

async function loadEntryDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    
    if (!id) {
        alert('未找到日记 ID');
        location.href = 'timeline.html';
        return;
    }

    try {
        // 为了确保拿到最新数据（包括媒体），可以从 API 获取
        // 这里的 API 目前只有 /timeline 返回列表，我们可以过滤
        const entries = await apiRequest('/timeline');
        currentEntry = entries.find(e => e.id == id);

        if (!currentEntry) {
            // 如果列表里没找到，可能是分页了，尝试直接从 API 获取（如果后端支持）
            // 暂时用这个逻辑，后续后端可增加 GET /entry/:id
            throw new Error('未找到该条日记内容');
        }

        renderDetail(currentEntry);
        initEvents();

    } catch (err) {
        console.error('Failed to load detail:', err);
        document.getElementById('display-content').textContent = '加载失败: ' + err.message;
    }
}

function renderDetail(entry) {
    const theme = getEntryTheme(entry.title);
    const dateObj = new Date(entry.date);
    
    // 渲染日期
    document.getElementById('display-date').textContent = formatDate(entry.date).split(' ')[0];
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    document.getElementById('display-weekday').textContent = `${weekdays[dateObj.getDay()]} · ${entry.type === 'milestone' ? '重要里程碑' : '成长日记'}`;
    
    // 渲染图标
    const iconEl = document.getElementById('display-icon');
    iconEl.textContent = entry.status === 'pending' ? '✨' : theme.icon;
    
    // 渲染标题
    document.getElementById('display-title').textContent = entry.title || '无标题记录';
    
    // 渲染正文
    document.getElementById('display-content').textContent = entry.content || '未填写心情记录...';
    
    // 渲染时间
    document.getElementById('display-time').textContent = `PUBLISHED AT ${formatDate(entry.date).split(' ')[1]}`;

    // 渲染媒体
    const mediaContainer = document.getElementById('display-media');
    if (entry.media && entry.media.length > 0) {
        if (entry.media.length === 1) {
            mediaContainer.className = "grid grid-cols-1 mb-10";
            mediaContainer.innerHTML = `<img src="${entry.media[0].url}" class="w-full rounded-2xl shadow-lg">`;
        } else if (entry.media.length === 2) {
            mediaContainer.className = "grid grid-cols-2 gap-4 mb-10";
            mediaContainer.innerHTML = entry.media.map(m => `<img src="${m.url}" class="w-full aspect-square object-cover rounded-2xl shadow-md">`).join('');
        } else {
            // 多图模式：网格展示
            mediaContainer.className = "grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10";
            mediaContainer.innerHTML = entry.media.map(m => `<img src="${m.url}" class="w-full aspect-square object-cover rounded-xl shadow-sm">`).join('');
        }
    } else {
        mediaContainer.innerHTML = '';
    }

    // 设置编辑链接
    const editBtn = document.getElementById('edit-btn');
    const targetPage = entry.status === 'pending' ? 'plan.html' : 'record.html';
    editBtn.onclick = () => {
        location.href = `${targetPage}?id=${entry.id}`;
    };

    if (window.lucide) lucide.createIcons();
}

function initEvents() {
    // 风格切换
    document.getElementById('mode-toggle').addEventListener('click', () => {
        currentStyle = (currentStyle + 1) % styles.length;
        applyStyle(currentStyle);
    });

    // 导出按钮
    document.getElementById('export-btn').addEventListener('click', () => {
        alert('海报生成功能正在开发中...\n提示：您可以先使用浏览器的“打印 -> 另存为 PDF”或手机截屏来分享哦！');
    });
}

function applyStyle(index) {
    const s = styles[index];
    const deco = document.getElementById('card-decorator');
    const iconBox = document.getElementById('display-icon');
    const weekday = document.getElementById('display-weekday');

    // 切换顶部装饰
    deco.className = `h-2 ${s.decorator}`;
    // 切换图标背景
    iconBox.className = `w-16 h-16 ${s.iconBg} rounded-full flex items-center justify-center text-3xl`;
    // 切换文字颜色
    weekday.className = `text-xs font-bold ${s.textAccent} uppercase tracking-widest mt-1`;
    
    // 给模式切换按钮一点反馈
    const toggleBtn = document.getElementById('mode-toggle');
    toggleBtn.innerHTML = `<i data-lucide="palette" class="w-4 h-4"></i>风格：${s.name}`;
    if (window.lucide) lucide.createIcons();
}

window.loadEntryDetail = loadEntryDetail;
