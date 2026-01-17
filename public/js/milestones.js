/**
 * milestones.js - 勋章墙逻辑
 */

async function loadMilestones() {
    const grid = document.getElementById('milestone-grid');
    
    try {
        const milestones = await apiRequest('/milestones');
        
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

    } catch (err) {
        console.error('Failed to load milestones:', err);
        grid.innerHTML = `
            <div class="col-span-full text-center py-10">
                <p class="text-rose-500 font-medium">加载失败: ${err.message}</p>
                <button onclick="location.reload()" class="mt-4 text-sm text-baby-pink-deep underline cursor-pointer">重试</button>
            </div>
        `;
    }
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
            <a href="complete.html?id=${m.id}&from=milestones" class="w-7 h-7 bg-white/90 backdrop-blur-sm text-green-600 rounded-full shadow-md border border-green-100 flex items-center justify-center hover:bg-green-500 hover:text-white transition-all" title="达成勋章">
                <i data-lucide="check" class="w-4 h-4"></i>
            </a>
        ` : '';
        
        return `
            <div class="milestone-card flex flex-col items-center group/card" id="milestone-${m.id}">
                <div class="relative group">
                    <div class="milestone-glow"></div>
                    <a href="detail.html?id=${m.id}" class="block relative z-10">
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
                    
                    <!-- 勋章卡片操作按钮 -->
                    <div class="absolute -top-2 -left-2 flex flex-col gap-2 opacity-0 group-hover/card:opacity-100 transition-all duration-300 z-20">
                        ${activateButton}
                        <a href="${editLink}" class="w-7 h-7 bg-white/90 backdrop-blur-sm text-baby-pink-deep rounded-full shadow-md border border-pink-100 flex items-center justify-center hover:bg-baby-pink-deep hover:text-white transition-all" title="编辑内容">
                            <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                        </a>
                        <button onclick="deleteMilestone(${m.id})" class="w-7 h-7 bg-white/90 backdrop-blur-sm text-rose-500 rounded-full shadow-md border border-rose-100 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all" title="删除勋章">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
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
    if (!confirm('确定要删除这个勋章吗？此操作无法撤销。')) {
        return;
    }

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
        alert('删除失败: ' + err.message);
    }
}

window.loadMilestones = loadMilestones;
window.deleteMilestone = deleteMilestone;
