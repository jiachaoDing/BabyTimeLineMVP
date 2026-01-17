/**
 * timeline.js - 美化版
 */

let allMilestones = []; 
let timelineEntries = [];
let currentPage = 1;
let pageSize = 10;
let isLoading = false;
let hasMore = true;
let currentSearch = '';
let currentType = 'all';

async function loadTimeline() {
    const loading = document.getElementById('loading');
    
    try {
        // 1. 并发获取勋章数据和第一页时光轴数据
        const [milestones, firstPage] = await Promise.all([
            apiRequest('/milestones'),
            fetchTimelinePage(1)
        ]);

        allMilestones = milestones;
        timelineEntries = firstPage;
        
        loading.style.display = 'none';

        // 2. 渲染勋章墙
        renderMilestoneWall(allMilestones);

        // 3. 渲染时光轴内容
        const container = document.getElementById('timeline-container');
        if (!timelineEntries || timelineEntries.length === 0) {
            renderEmptyState(container);
        } else {
            container.innerHTML = timelineEntries.map((entry, index) => renderEntry(entry, index)).join('');
            if(window.lucide) lucide.createIcons();
            
            // 4. 初始化无限滚动
            initInfiniteScroll();
        }

        // 5. 绑定搜索事件
        initFilters();

        // 6. 处理 Hash 滚动
        handleInitialHash();

    } catch (err) {
        console.error('Failed to load timeline:', err);
        loading.innerHTML = `
            <div class="text-center py-10">
                <p class="text-rose-500 font-medium">加载失败: ${err.message}</p>
                <button onclick="location.reload()" class="mt-4 text-sm text-baby-pink-deep underline cursor-pointer">重试</button>
            </div>
        `;
    }
}

async function fetchTimelinePage(page, search = '', type = 'all') {
    return await apiRequest(`/timeline?page=${page}&limit=${pageSize}&search=${encodeURIComponent(search)}&type=${type}`);
}

function renderEmptyState(container) {
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-20 text-center px-6 animate-fade-in">
            <div class="w-20 h-20 bg-baby-pink rounded-full flex items-center justify-center text-4xl mb-6 shadow-sm">📸</div>
            <h2 class="text-xl font-bold text-slate-800 mb-2">还没有任何记忆哦</h2>
            <p class="text-slate-500 mb-8 max-w-xs">点击下方的加号按钮，开始记录宝宝的第一个瞬间吧！</p>
            <a href="record.html" class="bg-baby-pink-deep text-white px-8 py-3 rounded-full font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all">
                立即开始
            </a>
        </div>
    `;
}

function initFilters() {
    const searchInput = document.getElementById('search-input');
    const typeFilter = document.getElementById('type-filter');

    // 防抖处理搜索
    let debounceTimer;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                currentSearch = e.target.value;
                resetAndReload();
            }, 500);
        });
    }
    if (typeFilter) {
        typeFilter.addEventListener('change', (e) => {
            currentType = e.target.value;
            resetAndReload();
        });
    }
}

async function resetAndReload() {
    currentPage = 1;
    hasMore = true;
    timelineEntries = [];
    
    const container = document.getElementById('timeline-container');
    container.innerHTML = '<div class="flex justify-center py-20"><div class="animate-spin text-4xl">🎈</div></div>';
    
    document.getElementById('no-more-data').classList.add('hidden');

    try {
        const data = await fetchTimelinePage(1, currentSearch, currentType);
        timelineEntries = data;
        
        if (timelineEntries.length === 0) {
            container.innerHTML = `<p class="text-center py-20 text-slate-400">没有找到匹配的回忆 🍃</p>`;
            hasMore = false;
        } else {
            container.innerHTML = timelineEntries.map((entry, index) => renderEntry(entry, index)).join('');
            if(window.lucide) lucide.createIcons();
            if (data.length < pageSize) {
                hasMore = false;
                document.getElementById('no-more-data').classList.remove('hidden');
            }
        }
    } catch (err) {
        console.error('Reload failed:', err);
    }
}

function initInfiniteScroll() {
    const trigger = document.getElementById('infinite-scroll-trigger');
    if (!trigger) return;

    const observer = new IntersectionObserver(async (entries) => {
        if (entries[0].isIntersecting && !isLoading && hasMore) {
            await loadMore();
        }
    }, { rootMargin: '200px' });

    observer.observe(trigger);
}

async function loadMore() {
    if (isLoading || !hasMore) return;
    
    isLoading = true;
    document.getElementById('loading-more').classList.remove('hidden');
    
    try {
        const nextPage = currentPage + 1;
        const data = await fetchTimelinePage(nextPage, currentSearch, currentType);
        
        if (!data || data.length === 0) {
            hasMore = false;
            document.getElementById('no-more-data').classList.remove('hidden');
        } else {
            const container = document.getElementById('timeline-container');
            // 追加渲染
            const startIndex = timelineEntries.length;
            const newHtml = data.map((entry, index) => renderEntry(entry, startIndex + index)).join('');
            
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = newHtml;
            while (tempDiv.firstChild) {
                container.appendChild(tempDiv.firstChild);
            }
            
            timelineEntries = [...timelineEntries, ...data];
            currentPage = nextPage;
            
            if(window.lucide) lucide.createIcons();
            
            if (data.length < pageSize) {
                hasMore = false;
                document.getElementById('no-more-data').classList.remove('hidden');
            }
        }
    } catch (err) {
        console.error('Load more failed:', err);
    } finally {
        isLoading = false;
        document.getElementById('loading-more').classList.add('hidden');
    }
}

function handleInitialHash() {
    if (window.location.hash) {
        const id = window.location.hash.replace('#entry-', '');
        if (id) {
            setTimeout(() => {
                scrollToEntry(null, id);
            }, 500);
        }
    }
}

function renderMilestoneWall(data) {
    const wall = document.getElementById('milestone-list');
    const stats = document.getElementById('milestone-stats');
    if (!wall) return;

    const milestones = data.filter(e => e.type === 'milestone');
    const completedCount = milestones.filter(e => e.status === 'completed').length;
    
    stats.textContent = `${completedCount} / ${milestones.length} 已达成`;

    // 排序：已完成的在前，未完成的在后
    const sortedMilestones = [...milestones].sort((a, b) => {
        if (a.status === 'completed' && b.status !== 'completed') return -1;
        if (a.status !== 'completed' && b.status === 'completed') return 1;
        return 0;
    });

    // 只显示前 8 个
    const displayMilestones = sortedMilestones.slice(0, 8);

    wall.innerHTML = displayMilestones.map(m => {
        const isCompleted = m.status === 'completed';
        const theme = getEntryTheme(m.title);
        return `
            <a href="#entry-${m.id}" onclick="scrollToEntry(event, ${m.id})" title="${m.title}" class="group relative">
                <div class="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all duration-500 ${isCompleted ? 'bg-gradient-to-br from-baby-yellow to-amber-200 shadow-[0_5px_15px_rgba(253,230,138,0.5)] scale-100 rotate-3' : 'bg-white/50 border-2 border-dashed border-slate-200 opacity-60 scale-90 -rotate-3'} group-hover:rotate-0 group-hover:scale-110">
                    <span class="text-xl sm:text-3xl ${isCompleted ? '' : 'grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100'} transition-all">${theme.icon}</span>
                    ${isCompleted ? '<div class="absolute -top-1.5 -right-1.5 bg-green-500 text-white rounded-full p-0.5 shadow-sm border-2 border-white animate-pulse"><i data-lucide="check" class="w-2.5 h-2.5"></i></div>' : ''}
                </div>
                <div class="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] sm:text-[10px] font-bold ${isCompleted ? 'text-amber-600' : 'text-slate-400'} opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all sm:bg-white/90 sm:backdrop-blur-sm px-1.5 sm:px-2.5 py-0.5 sm:py-1 sm:rounded-full sm:shadow-md z-30 pointer-events-none sm:border sm:border-slate-100 translate-y-0 sm:translate-y-2 sm:group-hover:translate-y-0">
                    ${m.title}
                </div>
            </a>
        `;
    }).join('');

    // 如果总数超过 8 个，添加一个“查看全部”的占位入口（或在 HTML 模板中已添加）
    if (milestones.length > 8) {
        wall.innerHTML += `
            <a href="milestones.html" class="group relative">
                <div class="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center transition-all duration-500 bg-white/40 border-2 border-dashed border-baby-pink/30 hover:bg-baby-pink/10 hover:border-baby-pink-deep/50 hover:scale-110">
                    <i data-lucide="more-horizontal" class="w-5 h-5 sm:w-6 sm:h-6 text-baby-pink-deep/60"></i>
                    <span class="text-[8px] sm:text-[10px] font-bold text-baby-pink-deep/60 mt-1">查看全部</span>
                </div>
            </a>
        `;
        if(window.lucide) lucide.createIcons();
    }
}

function scrollToEntry(event, id) {
    if (event) event.preventDefault();
    const element = document.getElementById(`entry-${id}`);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // 更新 URL hash 但不触发浏览器默认跳转
        history.pushState(null, null, `#entry-${id}`);
    }
}

function toggleMilestones() {
    const container = document.getElementById('milestone-list-container');
    const icon = document.getElementById('milestone-toggle-icon');
    if (!container || !icon) return;

    const isCollapsed = container.style.maxHeight === '0px';
    
    if (isCollapsed) {
        container.style.maxHeight = '1000px';
        container.style.opacity = '1';
        icon.style.transform = 'rotate(0deg)';
    } else {
        container.style.maxHeight = '0px';
        container.style.opacity = '0';
        icon.style.transform = 'rotate(180deg)';
    }
}

function renderEntry(entry, index) {
    const theme = getEntryTheme(entry.title);
    const isPending = entry.status === 'pending';
    
    // 布局逻辑...
    const isEven = index % 2 === 0;
    
    const wrapperClass = `relative z-10 flex items-center justify-center w-full mb-12 sm:mb-16`;
    
    // 内容容器样式：全端交替左右
    const contentWrapperClass = isEven 
        ? `w-1/2 pr-6 sm:pr-12 text-right flex flex-col items-end` 
        : `w-1/2 pl-6 sm:pl-12 text-left flex flex-col items-start`;

    const iconPositionClass = `absolute left-1/2 -translate-x-1/2 flex items-center justify-center`;

    // 整个卡片的点击跳转详情页逻辑 (排除掉按钮点击)
    const cardOnClick = `location.href='detail.html?id=${entry.id}'`;

    // 渲染照片墙 (智能布局方案)
    let mediaHtml = '';
    if (entry.media && entry.media.length > 0) {
        const count = entry.media.length;
        const isDesktopStack = count > 3; // 桌面端超过3张才堆叠
        const isMobileStack = count > 1;  // 移动端超过1张就堆叠

        const renderPhotoItem = (m, i, isStack, isDesktop) => {
            const zIndex = 40 - i;
            // 基础偏移 (堆叠状态下)
            const baseRotate = [2, -3, 1, -2][i % 4];
            const offsetH = (i - (Math.min(count, 4) - 1) / 2) * 4; // 居中微偏
            const offsetV = i * 2;
            
            // 扇形展开偏移 (居中对称展开)
            const fanRotate = (i - (Math.min(count, 4) - 1) / 2) * 10;
            const fanTranslateX = (i - (Math.min(count, 4) - 1) / 2) * (isDesktop ? 40 : 30);

            if (isStack) {
                return `
                    <div class="polaroid absolute w-[85px] h-[110px] sm:w-[130px] sm:h-[165px] transition-all duration-500 ease-out shadow-lg hover:shadow-2xl" 
                         style="z-index: ${zIndex}; 
                                left: 50%;
                                margin-left: ${isDesktop ? '-65px' : '-42px'};
                                transform: translateX(${offsetH}px) translateY(${offsetV}px) rotate(${baseRotate}deg);
                                --initial-transform: translateX(${offsetH}px) translateY(${offsetV}px) rotate(${baseRotate}deg);
                                --fan-transform: translateX(${fanTranslateX}px) translateY(-20px) rotate(${fanRotate}deg);"
                         onmouseover="this.style.transform='var(--fan-transform)'; this.style.zIndex='100'"
                         onmouseout="this.style.transform='var(--initial-transform)'; this.style.zIndex='${zIndex}'">
                        <img src="${m.url}" class="w-full h-[70px] sm:h-[110px] object-cover bg-slate-50" loading="lazy">
                        ${i === 0 && count > 1 ? `
                            <div class="absolute -top-2 -right-2 bg-baby-pink-deep text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-sm ring-2 ring-white z-50 animate-bounce">
                                ${count}
                            </div>
                        ` : ''}
                    </div>
                `;
            } else {
                // 平铺样式
                return `
                    <div class="polaroid w-[85px] h-[110px] sm:w-[130px] sm:h-[165px] shrink-0 rotate-${baseRotate > 0 ? '2' : '[-3deg]'} transition-all duration-300 hover:rotate-0 hover:scale-110 hover:z-30 shadow-md">
                        <img src="${m.url}" class="w-full h-[70px] sm:h-[110px] object-cover bg-slate-50" loading="lazy">
                    </div>
                `;
            }
        };

        mediaHtml = `
            <div class="w-full mt-8 overflow-visible">
                <!-- 桌面端布局 -->
                <div class="hidden sm:flex ${isDesktopStack ? 'relative h-[200px] justify-center group/stack' : (isEven ? 'justify-end pr-4' : 'justify-start pl-4')} flex-wrap gap-4">
                    ${entry.media.map((m, i) => renderPhotoItem(m, i, isDesktopStack, true)).join('')}
                </div>
                <!-- 移动端布局 -->
                <div class="flex sm:hidden ${isMobileStack ? 'relative h-[140px] justify-center group/stack' : 'justify-center'} flex-wrap gap-2">
                    ${entry.media.map((m, i) => renderPhotoItem(m, i, isMobileStack, false)).join('')}
                </div>
            </div>
        `;
    } else if (isPending) {
        mediaHtml = `
            <div class="mt-3 sm:mt-4 flex ${isEven ? 'justify-end' : 'justify-start'} w-full">
                <div class="w-full max-w-[120px] sm:max-w-[200px] aspect-video border-2 border-dashed border-baby-pink/30 rounded-lg sm:rounded-xl flex flex-col items-center justify-center bg-white/50 group-hover:bg-baby-pink/10 transition-colors">
                    <i data-lucide="camera" class="w-4 h-4 sm:w-6 sm:h-6 text-baby-pink-deep/40 mb-1 sm:mb-2"></i>
                    <span class="text-[8px] sm:text-[10px] text-baby-pink-deep/50 font-bold">待开启精彩</span>
                </div>
            </div>
        `;
    }

    // 渲染日期标签
    const dateHtml = `
        <div class="flex flex-col items-start gap-1">
            <span class="inline-block ${isPending ? 'bg-slate-100 text-slate-500' : 'bg-baby-yellow/30 text-slate-600'} text-[9px] sm:text-xs font-bold px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-sm rotate-1 border border-dashed ${isPending ? 'border-slate-200' : 'border-slate-300'}">
                ${isPending ? '📌 待达成的里程碑' : '📅 ' + formatDate(entry.date)}
            </span>
            ${entry.type === 'milestone' && !isPending ? `
                <span class="inline-flex items-center gap-1 bg-amber-100 text-amber-600 text-[8px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full shadow-sm border border-amber-200 animate-pulse">
                    <i data-lucide="medal" class="w-2.5 h-2.5 sm:w-3 sm:h-3"></i>
                    重要里程碑
                </span>
            ` : ''}
        </div>
    `;
    
    // 文字内容 HTML (放在卡片另一侧)
    const sideContentHtml = entry.content ? `
        <div class="w-1/2 ${isEven ? 'order-2 pl-6 sm:pl-12 text-left' : 'order-1 pr-6 sm:pr-12 text-right'} flex flex-col justify-center transition-all duration-500 group-hover:translate-y-[-5px]">
            <p class="${isPending ? 'text-slate-400 italic' : 'text-slate-600'} text-[11px] sm:text-base leading-relaxed whitespace-pre-wrap font-sans">
                ${entry.content}
            </p>
        </div>
    ` : `<div class="w-1/2 ${isEven ? 'order-2' : 'order-1'}"></div>`;
    
    const cardBorderClass = isPending 
        ? 'bg-white/60 backdrop-blur-sm border-2 border-dashed border-baby-pink/50 shadow-[0_8px_30px_rgb(255,175,204,0.15)]' 
        : 'bg-white/80 backdrop-blur-md border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_15px_45px_rgb(0,0,0,0.08)]';

    // 动态生成卡片顶部的装饰条颜色
    const topBarColor = isPending ? 'bg-slate-200' : (theme.color.split(' ')[0] || 'bg-baby-pink');

    return `
        <div class="flex items-center ${wrapperClass} group ${isPending ? 'is-pending-entry' : ''}" id="entry-${entry.id}">
            
            ${sideContentHtml}

            <!-- 中心图标节点 -->
            <div class="${iconPositionClass} z-20 cursor-pointer" onclick="${cardOnClick}">
                <div class="w-8 h-8 sm:w-11 sm:h-11 rounded-full border-4 border-white shadow-md ${isPending ? 'bg-white text-slate-300' : theme.color} flex items-center justify-center text-base sm:text-xl transform transition-all duration-500 group-hover:scale-125 group-hover:rotate-12">
                    ${isPending ? '✨' : theme.icon}
                </div>
                <!-- 节点光晕效果 -->
                <div class="absolute inset-0 w-8 h-8 sm:w-11 sm:h-11 rounded-full ${isPending ? 'bg-slate-100' : theme.color.split(' ')[0]} opacity-20 blur-sm scale-150 group-hover:opacity-40 transition-opacity"></div>
            </div>

            <div class="${contentWrapperClass} ${isEven ? 'order-1' : 'order-2'}">
                
                <div onclick="handleCardClick(event, ${entry.id})" class="relative ${cardBorderClass} p-0 rounded-2xl sm:rounded-[2rem] transition-all duration-500 w-full max-w-full sm:max-w-md group-hover:-translate-y-2 cursor-pointer sm:cursor-default">
                    
                    <!-- 卡片顶部装饰条 -->
                    <div class="absolute top-0 left-0 right-0 h-1.5 ${topBarColor} opacity-60 rounded-t-2xl sm:rounded-t-[2rem]"></div>

                    <div class="p-4 sm:p-6 overflow-visible" onclick="if(window.innerWidth >= 640) ${cardOnClick}">
                        ${isPending ? '' : `<div class="washi-tape ${isEven ? 'bg-blue-200/40' : 'bg-pink-200/40'} !-top-2"></div>`}
                        
                        <div class="flex justify-between items-start mb-3 sm:mb-4">
                            ${dateHtml}
                            <div class="hidden sm:flex gap-1 sm:gap-2">
                                <a href="${isPending ? 'plan.html' : 'record.html'}?id=${entry.id}" class="${isPending ? 'opacity-100 text-baby-pink-deep' : 'opacity-0 group-hover:opacity-100 text-slate-300 hover:text-baby-pink-deep'} transition-all p-1" title="${isPending ? '修订计划' : '编辑内容'}" onclick="event.stopPropagation()">
                                    <i data-lucide="${isPending ? 'sparkles' : 'edit-3'}" class="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5"></i>
                                </a>
                                <button onclick="event.stopPropagation(); deleteEntryItem(${entry.id})" class="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all p-1" title="删除">
                                    <i data-lucide="trash-2" class="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5"></i>
                                </button>
                            </div>
                        </div>

                        ${entry.title ? `<h3 class="text-base sm:text-xl font-extrabold ${isPending ? 'text-slate-500' : 'text-slate-800'} mb-2 leading-tight tracking-tight">${entry.title}</h3>` : ''}
                        
                        <div class="w-full overflow-visible">
                            ${mediaHtml}
                        </div>

                        ${isPending ? `
                            <a href="complete.html?id=${entry.id}" class="mt-4 block w-full py-2.5 bg-gradient-to-r from-baby-pink-deep to-pink-400 text-white text-[10px] sm:text-xs font-bold text-center rounded-xl shadow-md shadow-baby-pink/40 hover:brightness-105 active:scale-95 transition-all" onclick="event.stopPropagation()">
                                立即开启这个精彩瞬间
                            </a>
                        ` : ''}
                    </div>

                    <!-- 移动端操作遮罩层 -->
                    <div id="overlay-${entry.id}" class="mobile-overlay hidden absolute inset-0 bg-white/20 backdrop-blur-sm rounded-2xl sm:rounded-[2rem] flex items-center justify-center gap-6 z-50 animate-fade-in-fast" onclick="event.stopPropagation(); this.classList.add('hidden');">
                        <a href="detail.html?id=${entry.id}" class="flex flex-col items-center">
                            <div class="w-7 h-7 bg-white text-baby-pink-deep rounded-full flex items-center justify-center shadow-lg">
                                <i data-lucide="eye" class="w-4 h-4"></i>
                            </div>
                        </a>
                        <a href="${isPending ? 'plan.html' : 'record.html'}?id=${entry.id}" class="flex flex-col items-center">
                            <div class="w-7 h-7 bg-baby-pink-deep text-white rounded-full flex items-center justify-center shadow-lg">
                                <i data-lucide="${isPending ? 'sparkles' : 'edit-3'}" class="w-4 h-4"></i>
                            </div>
                        </a>
                        <button onclick="event.stopPropagation(); deleteEntryItem(${entry.id});" class="flex flex-col items-center">
                            <div class="w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </div>
                        </button>
                    </div>

                </div>
            </div>
        </div>
    `;
}

async function deleteEntryItem(id) {
    if (!confirm('确定要删除这个瞬间吗？此操作将同时删除关联的照片，且无法撤销。')) {
        return;
    }

    try {
        await apiRequest(`/entry/${id}`, {
            method: 'DELETE'
        });
        
        // 动画效果删除 DOM 元素
        const element = document.getElementById(`entry-${id}`);
        if (element) {
            element.classList.add('transition-all', 'duration-500', 'opacity-0', '-translate-y-4');
            setTimeout(() => {
                element.remove();
                // 检查是否为空，如果为空则重新加载显示“种子”提示
                const container = document.getElementById('timeline-container');
                if (container && !container.querySelector('[id^="entry-"]')) {
                    loadTimeline();
                }
            }, 500);
        }
    } catch (err) {
        console.error('Delete failed:', err);
        alert('删除失败: ' + err.message);
    }
}

// 导出
window.loadTimeline = loadTimeline;
window.deleteEntryItem = deleteEntryItem;
window.scrollToEntry = scrollToEntry;
window.toggleMilestones = toggleMilestones;

// 移动端操作逻辑
function handleCardClick(event, id) {
    if (window.innerWidth >= 640) return;
    
    // 如果点击的是照片区域或某些按钮，不触发 overlay
    if (event.target.closest('.polaroid') || event.target.closest('a')) return;
    
    const overlay = document.getElementById(`overlay-${id}`);
    if (overlay) {
        // 先隐藏其他所有 overlay
        document.querySelectorAll('.mobile-overlay').forEach(el => {
            if (el.id !== `overlay-${id}`) el.classList.add('hidden');
        });
        // 切换当前 overlay
        overlay.classList.toggle('hidden');
    }
}

// 全局点击监听：点击任何非 Overlay 区域都应该隐藏所有 overlay
document.addEventListener('click', (e) => {
    if (window.innerWidth >= 640) return;
    
    // 如果点击的不是卡片内部（用于触发 overlay）也不是 overlay 本身
    // 注意：handleCardClick 内部已经处理了点击卡片时的逻辑（切换显示或关闭其他）
    // 这里主要处理点击时光轴空白处、Header 等区域的情况
    if (!e.target.closest('[onclick^="handleCardClick"]') && !e.target.closest('.mobile-overlay')) {
        document.querySelectorAll('.mobile-overlay').forEach(el => el.classList.add('hidden'));
    }
});

window.handleCardClick = handleCardClick;