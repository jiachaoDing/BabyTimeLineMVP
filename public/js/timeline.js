/**
 * timeline.js - 美化版
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

async function loadTimeline() {
    const container = document.getElementById('timeline-container');
    const loading = document.getElementById('loading');

    try {
        const data = await apiRequest('/timeline');
        loading.style.display = 'none';

        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="text-center py-20 col-span-full">
                    <div class="inline-block p-6 bg-white rounded-full shadow-sm mb-4">
                        <span class="text-4xl">🌱</span>
                    </div>
                    <h2 class="text-lg text-slate-600 font-medium">种子已经埋下</h2>
                    <p class="text-slate-400 text-sm mt-2">快去记录第一个瞬间吧！</p>
                </div>
            `;
            return;
        }

        // 渲染条目，传入 index 用于判断左右
        container.innerHTML = data.map((entry, index) => renderEntry(entry, index)).join('');
        
        // 重新初始化图标（如果使用了 Lucide 图标）
        if(window.lucide) lucide.createIcons();

    } catch (err) {
        console.error('Failed:', err);
        loading.innerHTML = `<p class="text-rose-500">加载出错了: ${err.message}</p>`;
    }
}

function renderEntry(entry, index) {
    const theme = getEntryTheme(entry.title);
    
    // 布局逻辑：
    // 移动端(默认)：全部内容在右侧 (pl-12)
    // 桌面端(md)：
    //   - index 为偶数(0,2,4): 内容在左 (md:text-right md:pr-12 md:pl-0), 时间轴在中
    //   - index 为奇数(1,3,5): 内容在右 (md:text-left md:pl-12), 时间轴在中
    
    const isEven = index % 2 === 0;
    
    // 容器类名
    const wrapperClass = `relative z-10 flex items-center justify-between md:justify-center w-full mb-8`;
    
    // 内容位置类名 (核心响应式逻辑)
    // mobile: full width, padding left for line
    // desktop: half width
    const contentWrapperClass = isEven 
        ? `w-full pl-16 pr-4 md:w-1/2 md:pr-12 md:pl-4 md:text-right flex flex-col md:items-end` // Desktop Left
        : `w-full pl-16 pr-4 md:w-1/2 md:pl-12 md:pr-4 flex flex-col items-start`; // Desktop Right

    // 中轴图标位置
    // Mobile: left-8 (32px)
    // Desktop: left-1/2
    const iconPositionClass = `absolute left-8 md:left-1/2 -translate-x-1/2 flex items-center justify-center`;

    // 渲染照片墙 (拍立得风格)
    let mediaHtml = '';
    if (entry.media && entry.media.length > 0) {
        mediaHtml = `<div class="mt-4 flex flex-wrap gap-3 ${isEven ? 'md:justify-end' : 'justify-start'}">`;
        entry.media.forEach((m, i) => {
            // 随机旋转一点点，增加自然感
            const rotate = (i % 2 === 0 ? '-rotate-1' : 'rotate-2');
            mediaHtml += `
                <div class="polaroid w-24 h-32 sm:w-32 sm:h-40 cursor-pointer ${rotate}" onclick="window.open('${m.url}')">
                    <img src="${m.url}" class="w-full h-24 sm:h-32 object-cover bg-slate-100" loading="lazy">
                </div>
            `;
        });
        mediaHtml += `</div>`;
    }

    // 渲染日期标签 (胶带风格)
    const dateHtml = `
        <span class="inline-block bg-baby-yellow/30 text-slate-600 text-xs font-bold px-3 py-1 rounded-sm rotate-1 mb-2 border border-dashed border-slate-300">
            📅 ${formatDate(entry.date)}
        </span>
    `;

    // 整个条目的结构
    // 注意：在 Desktop 模式下，如果是偶数(左侧)，我们需要把 DOM 结构反转一下，或者利用 flex-row-reverse
    // 这里采用绝对定位中轴 + 左右 50% 宽度的 Block 来实现
    
    return `
        <div class="md:flex md:justify-between ${wrapperClass} group" id="entry-${entry.id}">
            
            <div class="hidden md:block md:w-1/2 ${isEven ? 'order-1' : 'order-1'}"></div>

            <div class="${iconPositionClass} w-10 h-10 rounded-full border-4 border-white shadow-md ${theme.color} z-20 text-xl transform transition-transform group-hover:scale-110">
                ${theme.icon}
            </div>

            <div class="${contentWrapperClass} ${isEven ? 'md:order-1' : 'md:order-3'}">
                
                <div class="relative bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 w-full max-w-md group-hover:-translate-y-1">
                    
                    <div class="washi-tape ${isEven ? 'bg-blue-200/50' : 'bg-pink-200/50'}"></div>
                    
                    <div class="flex justify-between items-start mb-2">
                        ${dateHtml}
                        <button onclick="deleteEntryItem(${entry.id})" class="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all p-1" title="删除">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>

                    ${entry.title ? `<h3 class="text-lg font-bold text-slate-800 mb-1 leading-tight">${entry.title}</h3>` : ''}
                    
                    ${entry.content ? `<p class="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap font-sans">${entry.content}</p>` : ''}

                    ${mediaHtml}

                </div>
            </div>
        </div>
    `;
}

// ... 保持 deleteEntryItem, formatDate 等函数不变 ...
// 注意：formatDate 建议稍微简化一下，例如 "2023年10月1日 星期五" -> "2023.10.01" 可能更适合卡片
function formatDate(dateStr) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${(d.getMonth()+1).toString().padStart(2,'0')}.${d.getDate().toString().padStart(2,'0')}`;
}

// 导出
window.loadTimeline = loadTimeline;