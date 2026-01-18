/**
 * 统一管理全局组件
 */


// ---------------------------------------------------------
// 全局自定义弹窗组件 (Toast & Modal)
// ---------------------------------------------------------

/**
 * 显示轻提示 (Toast)
 * @param {string} message 提示内容
 * @param {string} type 'success' | 'error' | 'info'
 * @param {number} duration 持续时间(ms)
 */
function showToast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed top-6 left-1/2 -translate-x-1/2 z-[110] flex flex-col gap-3 pointer-events-none w-full max-w-xs px-4';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    
    let bgClass, iconName;
    if (type === 'success') {
        bgClass = 'bg-white border-l-4 border-green-500 text-slate-700';
        iconName = 'check-circle';
    } else if (type === 'error') {
        bgClass = 'bg-white border-l-4 border-rose-500 text-slate-700';
        iconName = 'alert-circle';
    } else {
        bgClass = 'bg-white border-l-4 border-blue-500 text-slate-700';
        iconName = 'info';
    }

    toast.className = `${bgClass} shadow-lg rounded-xl p-4 flex items-center gap-3 transform transition-all duration-300 translate-y-[-20px] opacity-0 pointer-events-auto border border-slate-100`;
    toast.innerHTML = `
        <i data-lucide="${iconName}" class="w-5 h-5 shrink-0 ${type === 'success' ? 'text-green-500' : type === 'error' ? 'text-rose-500' : 'text-blue-500'}"></i>
        <span class="text-sm font-bold">${message}</span>
    `;

    container.appendChild(toast);
    
    // 初始化图标
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // 动画进入
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-[-20px]', 'opacity-0');
    });

    // 自动移除
    setTimeout(() => {
        toast.classList.add('opacity-0', '-translate-y-4');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * 初始化 Modal 结构 (单例)
 */
function ensureModalStructure() {
    if (document.getElementById('custom-modal')) return;

    const modalHtml = `
    <div id="custom-modal" class="fixed inset-0 z-[100] hidden" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity opacity-0 duration-300" id="modal-backdrop"></div>
        
        <!-- Modal Panel -->
        <div class="absolute inset-0 z-10 overflow-y-auto">
            <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                <div id="modal-panel" class="relative transform overflow-hidden rounded-[2rem] bg-white text-left shadow-2xl transition-all sm:my-8 w-full max-w-sm opacity-0 translate-y-4 scale-95 duration-300 border-4 border-white ring-4 ring-baby-pink/20">
                    <!-- 装饰元素 -->
                    <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-baby-pink via-baby-yellow to-mist-blue"></div>
                    <div class="absolute -top-6 -right-6 w-16 h-16 bg-baby-yellow/20 rounded-full blur-xl"></div>
                    <div class="absolute -bottom-6 -left-6 w-20 h-20 bg-baby-pink/20 rounded-full blur-xl"></div>

                    <div class="bg-white px-6 pb-6 pt-8 sm:p-8 sm:pb-6 relative z-10">
                        <div class="flex flex-col items-center">
                            <div id="modal-icon-wrapper" class="mx-auto flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-baby-pink/20 mb-5 animate-bounce-slow">
                                <i id="modal-icon" data-lucide="alert-triangle" class="h-7 w-7 text-baby-pink-deep"></i>
                            </div>
                            <div class="text-center w-full">
                                <h3 class="text-xl font-extrabold leading-6 text-slate-800 tracking-tight" id="modal-title">
                                    提示
                                </h3>
                                <div class="mt-3">
                                    <p class="text-sm text-slate-500 leading-relaxed font-medium" id="modal-message">
                                        内容
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="bg-slate-50/50 px-6 py-4 sm:px-8 flex flex-col sm:flex-row-reverse gap-3 relative z-10" id="modal-actions">
                        <!-- Buttons injected here -->
                    </div>
                </div>
            </div>
        </div>
    </div>
    <style>
        .animate-bounce-slow { animation: bounce 2s infinite; }
    </style>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

/**
 * 打开自定义确认框
 * @param {Object} options 配置项
 * @param {string} options.title 标题
 * @param {string} options.message 内容
 * @param {string} options.confirmText 确认按钮文字
 * @param {string} options.cancelText 取消按钮文字
 * @param {string} options.type 'danger' | 'info' | 'success'
 * @returns {Promise<boolean>}
 */
function showConfirm({ title = '确认操作', message, confirmText = '确定', cancelText = '取消', type = 'danger' }) {
    ensureModalStructure();
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-modal');
        const backdrop = document.getElementById('modal-backdrop');
        const panel = document.getElementById('modal-panel');
        const titleEl = document.getElementById('modal-title');
        const msgEl = document.getElementById('modal-message');
        const actionsEl = document.getElementById('modal-actions');
        const iconWrapper = document.getElementById('modal-icon-wrapper');
        const icon = document.getElementById('modal-icon');

        // 设置内容
        titleEl.textContent = title;
        msgEl.textContent = message;

        // 设置样式
        if (type === 'danger') {
            iconWrapper.className = 'mx-auto flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-rose-100 mb-5';
            icon.className = 'h-7 w-7 text-rose-500';
            icon.setAttribute('data-lucide', 'alert-triangle');
        } else if (type === 'success') {
            iconWrapper.className = 'mx-auto flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-green-100 mb-5';
            icon.className = 'h-7 w-7 text-green-600';
            icon.setAttribute('data-lucide', 'check');
        } else {
            iconWrapper.className = 'mx-auto flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 mb-5';
            icon.className = 'h-7 w-7 text-blue-500';
            icon.setAttribute('data-lucide', 'info');
        }

        // 设置按钮
        const confirmBtnClass = type === 'danger' 
            ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200' 
            : 'bg-baby-pink-deep hover:bg-rose-400 shadow-baby-pink/40';
        
        actionsEl.innerHTML = `
            <button type="button" id="modal-confirm" class="inline-flex w-full justify-center rounded-full ${confirmBtnClass} px-5 py-3 text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 sm:w-auto sm:min-w-[100px]">
                ${confirmText}
            </button>
            <button type="button" id="modal-cancel" class="mt-3 inline-flex w-full justify-center rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-500 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 transition-all active:scale-95 sm:mt-0 sm:w-auto sm:min-w-[80px]">
                ${cancelText}
            </button>
        `;

        if (typeof lucide !== 'undefined') lucide.createIcons();

        // 显示 Modal
        modal.classList.remove('hidden');
        // 强制重绘以触发动画
        void modal.offsetWidth;
        
        backdrop.classList.remove('opacity-0');
        panel.classList.remove('opacity-0', 'translate-y-4', 'scale-95');

        // 事件处理
        const close = (result) => {
            backdrop.classList.add('opacity-0');
            panel.classList.add('opacity-0', 'translate-y-4', 'scale-95');
            setTimeout(() => {
                modal.classList.add('hidden');
                resolve(result);
            }, 300);
        };

        document.getElementById('modal-confirm').onclick = () => close(true);
        document.getElementById('modal-cancel').onclick = () => close(false);
    });
}

/**
 * 显示 Alert 提示框
 */
function showAlert(message, title = '提示', btnText = '知道了') {
    ensureModalStructure();
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-modal');
        const backdrop = document.getElementById('modal-backdrop');
        const panel = document.getElementById('modal-panel');
        const titleEl = document.getElementById('modal-title');
        const msgEl = document.getElementById('modal-message');
        const actionsEl = document.getElementById('modal-actions');
        const iconWrapper = document.getElementById('modal-icon-wrapper');
        const icon = document.getElementById('modal-icon');

        titleEl.textContent = title;
        msgEl.textContent = message;

        // Info style
        iconWrapper.className = 'mx-auto flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 mb-5';
        icon.className = 'h-7 w-7 text-blue-500';
        icon.setAttribute('data-lucide', 'info');

        actionsEl.innerHTML = `
            <button type="button" id="modal-ok" class="inline-flex w-full justify-center rounded-full bg-baby-pink-deep hover:bg-rose-400 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-baby-pink/40 transition-all hover:scale-[1.02] active:scale-95 sm:w-auto sm:min-w-[120px]">
                ${btnText}
            </button>
        `;
        
        if (typeof lucide !== 'undefined') lucide.createIcons();

        modal.classList.remove('hidden');
        void modal.offsetWidth;
        backdrop.classList.remove('opacity-0');
        panel.classList.remove('opacity-0', 'translate-y-4', 'scale-95');

        const close = () => {
            backdrop.classList.add('opacity-0');
            panel.classList.add('opacity-0', 'translate-y-4', 'scale-95');
            setTimeout(() => {
                modal.classList.add('hidden');
                resolve();
            }, 300);
        };

        document.getElementById('modal-ok').onclick = close;
    });
}

// ---------------------------------------------------------

// 辅助：根据标题内容返回不同的 Emoji/图标背景色
function getEntryTheme(title = "") {
    const t = title.toLowerCase();
    if (t.includes('生日') || t.includes('birthday') || t.includes('岁') || t.includes('出生')) 
        return { icon: '🎂', color: 'bg-yellow-100 text-yellow-600 border-yellow-200' };
    if (t.includes('第一次') || t.includes('first')) 
        return { icon: '🏆', color: 'bg-purple-100 text-purple-600 border-purple-200' };
    if (t.includes('笑') || t.includes('玩') || t.includes('游') || t.includes('乐') || t.includes('开心')) 
        return { icon: '🎠', color: 'bg-green-100 text-green-600 border-green-200' };
    if (t.includes('病') || t.includes('苗') || t.includes('医')) 
        return { icon: '💊', color: 'bg-blue-50 text-blue-500 border-blue-100' };
    
    // 默认
    return { icon: '👶', color: 'bg-pink-50 text-pink-400 border-pink-200' };
}

// 格式化日期：2023.10.01 14:30
function formatDate(dateStr) {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${year}.${month}.${day} ${hours}:${minutes}`;
}

function initHeader() {
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (!headerPlaceholder) return;

    const currentPath = window.location.pathname;
    
    // 检查当前页面是否匹配路径 (兼容 .html 后缀和无后缀的情况)
    const isTimeline = currentPath === '/' || currentPath.endsWith('/') || 
                       currentPath.includes('timeline') || 
                       (currentPath.includes('index.html') && !currentPath.includes('login'));
    const isPhotos = currentPath.includes('photos');
    const isUpload = currentPath.includes('upload');
    const isMilestones = currentPath.includes('milestones');

    const navItems = [
        { name: '时光轴', short: '时光', href: 'timeline.html', active: isTimeline },
        { name: '勋章馆', short: '勋章', href: 'milestones.html', active: isMilestones },
        { name: '照片墙', short: '照片', href: 'photos.html', active: isPhotos },
        { name: '记录', short: '<i data-lucide="plus-circle" class="w-5 h-5"></i>', href: 'record.html', active: isUpload, isIcon: true }
    ];

    const navHtml = navItems.map(item => {
        const content = item.isIcon 
            ? `<span class="sm:hidden">${item.short}</span><span class="hidden sm:inline">${item.name}</span>`
            : `<span class="sm:hidden">${item.short}</span><span class="hidden sm:inline">${item.name}</span>`;

        if (item.active) {
            return `
                <a href="${item.href}" class="relative text-sm font-bold text-baby-pink-deep flex items-center">
                    ${content}
                    <span class="absolute -bottom-1 left-0 w-full h-1 bg-baby-pink-deep/30 rounded-full"></span>
                </a>
            `;
        } else {
            return `
                <a href="${item.href}" class="text-sm font-medium text-slate-500 hover:text-baby-pink-deep transition-colors flex items-center">
                    ${content}
                </a>
            `;
        }
    }).join('');

    // 只在时光轴和照片墙页面显示搜索按钮
    const showSearch = isTimeline || isPhotos;
    const searchButtonHtml = showSearch ? `
        <button id="search-toggle" class="text-slate-500 hover:text-baby-pink-deep transition-colors flex items-center" title="搜索">
            <i data-lucide="search" class="w-5 h-5"></i>
        </button>
    ` : '';

    // Inject Google Font for artistic text (Using loli.net mirror for China access)
    if (!document.querySelector('link[href="https://fonts.loli.net/css2?family=Pacifico&display=swap"]')) {
        const fontLink = document.createElement('link');
        fontLink.href = 'https://fonts.loli.net/css2?family=Pacifico&display=swap';
        fontLink.rel = 'stylesheet';
        document.head.appendChild(fontLink);
    }

    const headerHtml = `
    <nav class="sticky top-4 mx-auto max-w-4xl px-4 z-50 mb-10">
        <div class="bg-white/80 backdrop-blur-md border border-white/40 shadow-sm rounded-full px-6 py-3 flex justify-between items-center">
            <div class="flex items-center gap-2">
                <span class="text-xl text-baby-pink-deep tracking-wide" style="font-family: 'Pacifico', cursive;" title="邹云舒">ZYS</span>
            </div>
            <div class="flex items-center gap-3 sm:gap-6">
                ${navHtml}
                ${searchButtonHtml}
                <button onclick="logout()" class="text-slate-400 hover:text-rose-500 flex items-center" title="退出登录">
                    <i data-lucide="log-out" class="w-5 h-5"></i>
                </button>
            </div>
        </div>
        <!-- 搜索面板 -->
        ${showSearch ? `
        <div id="search-panel" class="hidden mt-4 mx-auto max-w-4xl animate-in slide-in-from-top-2 duration-200">
            <div class="bg-white/60 backdrop-blur-md border border-white/60 rounded-3xl shadow-lg p-4 flex flex-col sm:flex-row gap-4">
                <div class="relative flex-1">
                    <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                    <input type="text" id="search-input" placeholder="搜索云舒的回忆..." 
                        class="w-full pl-11 pr-10 py-2.5 bg-white/40 border border-white/40 rounded-full focus:ring-2 focus:ring-baby-pink-deep/30 outline-none transition-all text-sm">
                    <button id="search-clear" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 hidden">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>
                <select id="type-filter" class="px-6 py-2.5 bg-white/40 border border-white/40 rounded-full focus:ring-2 focus:ring-baby-pink-deep/30 outline-none transition-all text-sm font-medium text-slate-600 appearance-none cursor-pointer">
                    <option value="all">显示全部</option>
                    <option value="milestone">只看里程碑</option>
                    <option value="daily">只看日记</option>
                </select>
                <button id="search-confirm" class="px-6 py-2.5 bg-baby-pink-deep text-white text-sm font-bold rounded-full shadow-md hover:brightness-105 active:scale-95 transition-all whitespace-nowrap">
                    搜索
                </button>
            </div>
        </div>
        ` : ''}
    </nav>
    `;

    headerPlaceholder.innerHTML = headerHtml;

    // 搜索面板切换逻辑
    const searchToggle = document.getElementById('search-toggle');
    const searchPanel = document.getElementById('search-panel');
    const searchInput = document.getElementById('search-input');

    if (searchToggle && searchPanel) {
        searchToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            searchPanel.classList.toggle('hidden');
            if (!searchPanel.classList.contains('hidden')) {
                searchInput.focus();
            }
        });

        // 点击外部关闭搜索面板
        document.addEventListener('click', (e) => {
            if (!searchPanel.classList.contains('hidden')) {
                const isClickInsidePanel = searchPanel.contains(e.target);
                const isClickOnToggle = searchToggle.contains(e.target);
                
                if (!isClickInsidePanel && !isClickOnToggle) {
                    searchPanel.classList.add('hidden');
                }
            }
        });

        // 防止搜索面板内部点击冒泡导致面板关闭
        searchPanel.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    // 初始化 Lucide 图标
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // 派发自定义事件，通知其他脚本 Header 已加载
    document.dispatchEvent(new CustomEvent('header-loaded'));
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeader);
} else {
    initHeader();
}
