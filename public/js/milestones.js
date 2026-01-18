/**
 * milestones.js - 勋章墙逻辑
 */

async function loadMilestones() {
    const grid = document.getElementById('milestone-grid');
    
    // 0. 尝试优先加载本地缓存 (极速屏显)
    const cachedMilestones = localStorage.getItem('milestone_cache_data');
    if (cachedMilestones) {
        try {
            const parsed = JSON.parse(cachedMilestones);
            if (parsed.length > 0) {
                renderMilestoneData(parsed);
                console.log('Milestones loaded from local cache');
            }
        } catch (e) {
            console.warn('Cache parse failed:', e);
            localStorage.removeItem('milestone_cache_data');
        }
    }

    try {
        // 1. 检查数据同步状态
        const syncRes = await apiRequest('/sync-check');
        const lastUpdated = syncRes.last_updated;
        const localLastUpdated = localStorage.getItem('milestone_last_updated');
        
        // 如果本地有缓存且时间戳一致，直接使用缓存
        if (cachedMilestones && lastUpdated && lastUpdated === localLastUpdated) {
            console.log('Milestones are up-to-date');
            if (grid.children.length === 0) { // 确保渲染
                 const parsed = JSON.parse(cachedMilestones);
                 renderMilestoneData(parsed);
            }
            return;
        }

        // 2. 数据不一致或无缓存，获取最新数据
        console.log('Fetching new milestone data...');
        const milestones = await apiRequest('/milestones');
        
        // 3. 写入缓存和时间戳
        localStorage.setItem('milestone_cache_data', JSON.stringify(milestones));
        if (lastUpdated) {
            localStorage.setItem('milestone_last_updated', lastUpdated);
        }

        // 4. 处理并渲染
        renderMilestoneData(milestones);

    } catch (err) {
        console.error('Failed to load milestones:', err);
        if (!cachedMilestones) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-10">
                    <p class="text-rose-500 font-medium">加载失败: ${err.message}</p>
                    <button onclick="location.reload()" class="mt-4 text-sm text-baby-pink-deep underline cursor-pointer">重试</button>
                </div>
            `;
        }
    }
}

function renderMilestoneData(milestones) {
    // 过滤并排序：已完成优先
    const list = milestones.filter(e => e.type === 'milestone').sort((a, b) => {
        if (a.status === 'completed' && b.status !== 'completed') return -1;
        if (a.status !== 'completed' && b.status === 'completed') return 1;
        // 已完成的按日期降序，未完成的按预设（或原有）顺序
        if (a.status === 'completed' && b.status === 'completed') {
            return new Date(b.date) - new Date(a.date);
        }
        return 0;
    });

    renderStats(list);
    renderGrid(list);
}

function renderStats(list) {
    const total = list.length;
    const completed = list.filter(m => m.status === 'completed').length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    document.getElementById('total-stats').textContent = total;
    document.getElementById('completed-stats').textContent = completed;
    document.getElementById('percent-stats').textContent = percent + '%';
}

function renderGrid(list) {
    const grid = document.getElementById('milestone-grid');
    
    if (list.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-20 text-slate-400 font-medium">暂无里程碑数据 🍃</div>`;
        return;
    }

    grid.innerHTML = list.map(m => {
        const isCompleted = m.status === 'completed';
        const theme = getEntryTheme(m.title);
        const dateStr = isCompleted ? formatDate(m.date).split(' ')[0] : '尚未达成';
        
        // 根据状态决定编辑按钮的链接
        const editLink = isCompleted 
            ? `record.html?id=${m.id}&from=milestones` 
            : `plan.html?id=${m.id}&from=milestones`;

        // 只有未完成的勋章有“激活”按钮
        const activateButton = !isCompleted ? `
            <a href="complete.html?id=${m.id}&from=milestones" class="w-8 h-8 bg-white/95 backdrop-blur-sm text-green-600 rounded-full shadow-lg border border-green-100 flex items-center justify-center hover:bg-green-500 hover:text-white transition-all transform active:scale-95" title="达成勋章" onclick="event.stopPropagation()">
                <i data-lucide="check" class="w-4 h-4"></i>
            </a>
        ` : '';
        
        return `
            <div class="milestone-card flex flex-col items-center group/card" id="milestone-${m.id}" onclick="handleMilestoneClick(event, ${m.id})">
                <div class="relative group">
                    <div class="milestone-glow"></div>
                    <a href="detail.html?id=${m.id}" class="block relative z-10" onclick="if(window.innerWidth < 640) { event.preventDefault(); }">
                        <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-[2rem] flex items-center justify-center transition-all duration-500 
                            ${isCompleted ? 'bg-gradient-to-br from-baby-yellow to-amber-200 shadow-[0_10px_25px_rgba(253,230,138,0.6)] rotate-3' : 'bg-white/40 border-2 border-dashed border-slate-200 grayscale opacity-60 -rotate-3'}">
                            <span class="text-3xl sm:text-4xl transition-transform duration-500 group-hover:scale-110">${theme.icon}</span>
                            
                            ${isCompleted ? `
                                <div class="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-1 shadow-md border-2 border-white animate-pulse">
                                    <i data-lucide="check" class="w-3 h-3"></i>
                                </div>
                            ` : ''}
                        </div>
                    </a>
                    
                    <!-- 桌面端 Hover 菜单 -->
                    <div class="hidden sm:flex absolute -top-2 -left-2 flex-col gap-2 opacity-0 group-hover/card:opacity-100 transition-all duration-300 z-20">
                        ${activateButton}
                        <a href="${editLink}" class="w-7 h-7 bg-white/90 backdrop-blur-sm text-baby-pink-deep rounded-full shadow-md border border-pink-100 flex items-center justify-center hover:bg-baby-pink-deep hover:text-white transition-all" title="编辑内容">
                            <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                        </a>
                        <button onclick="deleteMilestone(${m.id})" class="w-7 h-7 bg-white/90 backdrop-blur-sm text-rose-500 rounded-full shadow-md border border-rose-100 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all" title="删除勋章">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>

                    <!-- 移动端点击遮罩层 -->
                    <div id="mobile-overlay-${m.id}" class="mobile-milestone-overlay hidden absolute inset-0 rounded-[2rem] bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-fast" onclick="event.stopPropagation(); this.classList.add('hidden');">
                        <div class="flex items-center gap-3">
                            <a href="detail.html?id=${m.id}" class="w-9 h-9 bg-white text-slate-700 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                                <i data-lucide="eye" class="w-4 h-4"></i>
                            </a>
                            ${activateButton}
                            <a href="${editLink}" class="w-9 h-9 bg-baby-pink-deep text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform" onclick="event.stopPropagation()">
                                <i data-lucide="edit-3" class="w-4 h-4"></i>
                            </a>
                            <button onclick="event.stopPropagation(); deleteMilestone(${m.id})" class="w-9 h-9 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>

                </div>
                
                <div class="mt-4 text-center">
                    <h3 class="text-sm sm:text-base font-bold ${isCompleted ? 'text-slate-800' : 'text-slate-400'} mb-1">${m.title}</h3>
                    <div class="inline-block px-2 py-0.5 rounded-full ${isCompleted ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'} text-[10px] font-bold">
                        ${dateStr}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

async function deleteMilestone(id) {
    const confirmed = await showConfirm({
        title: '删除确认',
        message: '确定要删除这个勋章吗？此操作无法撤销。',
        type: 'danger'
    });
    if (!confirmed) return;

    try {
        await apiRequest(`/entry/${id}`, {
            method: 'DELETE'
        });
        
        // 动画效果删除 DOM 元素
        const element = document.getElementById(`milestone-${id}`);
        if (element) {
            element.classList.add('transition-all', 'duration-500', 'opacity-0', 'scale-75');
            setTimeout(() => {
                element.remove();
                // 重新加载统计数据（或者本地计算一下，为了简单直接重新获取一次）
                loadMilestones();
            }, 500);
        }
    } catch (err) {
        console.error('Delete failed:', err);
        showToast('删除失败: ' + err.message, 'error');
    }
}

window.loadMilestones = loadMilestones;
window.deleteMilestone = deleteMilestone;
window.handleMilestoneClick = handleMilestoneClick;

// 移动端交互逻辑
function handleMilestoneClick(event, id) {
    if (window.innerWidth >= 640) return; // 桌面端不触发

    // 如果点击的是已经存在的操作按钮或链接，不触发
    if (event.target.closest('a') && !event.target.closest('a').getAttribute('href').includes('detail.html')) return;
    if (event.target.closest('button')) return;

    // 显示/隐藏当前遮罩
    const overlay = document.getElementById(`mobile-overlay-${id}`);
    if (overlay) {
        // 先隐藏其他的
        document.querySelectorAll('.mobile-milestone-overlay').forEach(el => {
            if (el.id !== `mobile-overlay-${id}`) el.classList.add('hidden');
        });
        
        overlay.classList.toggle('hidden');
    }
}

// 全局点击监听，点击空白处关闭所有遮罩
document.addEventListener('click', (e) => {
    if (window.innerWidth >= 640) return;
    
    if (!e.target.closest('[onclick^="handleMilestoneClick"]') && !e.target.closest('.mobile-milestone-overlay')) {
        document.querySelectorAll('.mobile-milestone-overlay').forEach(el => el.classList.add('hidden'));
    }
});