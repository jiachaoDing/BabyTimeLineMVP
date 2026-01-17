/**
 * 统一管理全局组件
 */

// 辅助：根据标题内容返回不同的 Emoji/图标背景色
function getEntryTheme(title = "") {
    const t = title.toLowerCase();
    if (t.includes('生日') || t.includes('birthday') || t.includes('岁')) 
        return { icon: '🎂', color: 'bg-yellow-100 text-yellow-600 border-yellow-200' };
    if (t.includes('第一次') || t.includes('first')) 
        return { icon: '🏆', color: 'bg-purple-100 text-purple-600 border-purple-200' };
    if (t.includes('笑') || t.includes('玩') || t.includes('游')) 
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

    // 只在时光轴页面显示搜索按钮
    const searchButtonHtml = isTimeline ? `
        <button id="search-toggle" class="text-slate-500 hover:text-baby-pink-deep transition-colors flex items-center" title="搜索">
            <i data-lucide="search" class="w-5 h-5"></i>
        </button>
    ` : '';

    const headerHtml = `
    <nav class="sticky top-4 mx-auto max-w-4xl px-4 z-50 mb-10">
        <div class="bg-white/80 backdrop-blur-md border border-white/40 shadow-sm rounded-full px-6 py-3 flex justify-between items-center">
            <div class="flex items-center gap-2">
                <div class="bg-baby-pink-deep/10 p-1.5 rounded-full">
                    <i data-lucide="heart" class="w-5 h-5 text-baby-pink-deep fill-current"></i>
                </div>
                <span class="font-bold text-lg text-slate-700 tracking-wide">Baby</span>
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
        ${isTimeline ? `
        <div id="search-panel" class="hidden mt-4 mx-auto max-w-4xl animate-in slide-in-from-top-2 duration-200">
            <div class="bg-white/60 backdrop-blur-md border border-white/60 rounded-3xl shadow-lg p-4 flex flex-col sm:flex-row gap-4">
                <div class="relative flex-1">
                    <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                    <input type="text" id="search-input" placeholder="搜索宝宝的回忆..." 
                        class="w-full pl-11 pr-4 py-2.5 bg-white/40 border border-white/40 rounded-full focus:ring-2 focus:ring-baby-pink-deep/30 outline-none transition-all text-sm">
                </div>
                <select id="type-filter" class="px-6 py-2.5 bg-white/40 border border-white/40 rounded-full focus:ring-2 focus:ring-baby-pink-deep/30 outline-none transition-all text-sm font-medium text-slate-600 appearance-none cursor-pointer">
                    <option value="all">显示全部</option>
                    <option value="milestone">只看里程碑</option>
                    <option value="daily">只看日记</option>
                </select>
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
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeader);
} else {
    initHeader();
}
