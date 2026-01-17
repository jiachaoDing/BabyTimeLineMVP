/**
 * photos.js - 接入真实数据与懒加载
 */

let allMediaItems = []; // 展开后的所有媒体项
let renderedCount = 0;   // 已渲染的数量
const PAGE_SIZE = 12;    // 每页加载数量
let galleryInstance = null;

/**
 * 1. 数据获取与处理
 */
async function loadGalleryData() {
    const loader = document.getElementById('gallery-loader');
    try {
        // 获取所有时间轴数据 (包含日记和里程碑)
        const entries = await apiRequest('/timeline?limit=1000'); // 尽量一次性获取所有元数据，因为媒体项需要展开
        
        // 展开数据：将 entry.media 展开为独立的照片对象
        allMediaItems = [];
        entries.forEach(entry => {
            if (entry.media && entry.media.length > 0) {
                entry.media.forEach(m => {
                    allMediaItems.push({
                        id: m.id,
                        url: m.url,
                        date: entry.date,
                        title: entry.title || (entry.type === 'milestone' ? '重要里程碑' : '日常瞬间'),
                        excerpt: entry.content || '',
                        type: entry.type,
                        // 预设比例，等图片加载后再修正
                        aspectRatio: 1 
                    });
                });
            }
        });

        if (loader) loader.classList.add('hidden');

        if (allMediaItems.length === 0) {
            renderEmptyState();
            return;
        }

        // 初始化画廊组件
        galleryInstance = new ArtisticGallery('gallery-root');
        loadNextBatch(); // 加载第一批

        // 绑定滚动加载
        initInfiniteScroll();

    } catch (err) {
        console.error('Failed to load gallery:', err);
        if (loader) loader.innerHTML = `<p class="text-rose-500">加载失败: ${err.message}</p>`;
    }
}

function renderEmptyState() {
    const root = document.getElementById('gallery-root');
    root.innerHTML = `
        <div class="col-span-full py-20 text-center">
            <div class="text-4xl mb-4">🖼️</div>
            <p class="text-slate-400">还没有照片哦，快去上传吧！</p>
        </div>
    `;
}

/**
 * 2. 懒加载逻辑
 */
async function loadNextBatch() {
    if (renderedCount >= allMediaItems.length) return;

    const nextBatch = allMediaItems.slice(renderedCount, renderedCount + PAGE_SIZE);
    renderedCount += nextBatch.length;
    
    // 改为 await，等待布局计算完成
    await galleryInstance.appendItems(nextBatch);

    if (renderedCount >= allMediaItems.length) {
        const trigger = document.getElementById('infinite-scroll-trigger');
        if (trigger) trigger.innerHTML = '<p class="text-slate-300 text-xs py-10 italic">✨ 已展示所有珍贵回忆 ✨</p>';
    }
}

function initInfiniteScroll() {
    const trigger = document.getElementById('infinite-scroll-trigger');
    if (!trigger) return;

    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && renderedCount < allMediaItems.length) {
            loadNextBatch();
        }
    }, { rootMargin: '400px' });

    observer.observe(trigger);
}

/**
 * 3. 布局引擎
 */
class ArtisticGallery {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.isDesktop = window.innerWidth >= 1024;
        this.colHeights = [0, 0, 0]; // 仅桌面端使用
        this.setupContainer();
        
        if (this.isDesktop) {
            this.bindParallax();
        }

        window.addEventListener('resize', () => {
            const currentIsDesktop = window.innerWidth >= 1024;
            if (currentIsDesktop !== this.isDesktop) {
                location.reload(); // 切换断点时刷新布局最稳妥
            }
        });
    }

    setupContainer() {
        if (this.isDesktop) {
            this.container.className = 'relative w-full max-w-[1200px] mx-auto';
            this.container.style.height = '0px';
        } else {
            this.container.className = 'grid grid-cols-1 sm:grid-cols-2 gap-6 p-2';
            this.container.style.height = 'auto';
        }
    }

    async appendItems(items) {
        // 1. 先创建所有 DOM 并添加到容器中（此时高度可能还没确定）
        const cardsWithData = items.map((item, index) => {
            const card = this.createCardDOM(item);
            this.container.appendChild(card);
            return { card, item, globalIndex: renderedCount - items.length + index };
        });

        if (this.isDesktop) {
            // 2. 等待这一批图片加载完成，以便获取真实高度
            await Promise.all(cardsWithData.map(obj => {
                const img = obj.card.querySelector('img');
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => {
                    img.onload = resolve;
                    img.onerror = resolve; // 即使加载失败也继续布局
                });
            }));

            // 3. 图片加载完成后，依次计算位置
            cardsWithData.forEach(obj => {
                this.positionCardDesktop(obj.card, obj.item, obj.globalIndex);
            });
        }
    }

    positionCardDesktop(card, item, globalIndex) {
        const colCount = 3;
        const colWidth = 33.33;
        const cardWidthPx = 320;
        const gapY = 100;

        // 找到最短列
        const colIndex = this.colHeights.indexOf(Math.min(...this.colHeights));
        
        const baseLeft = (colIndex * colWidth) + (colWidth / 2);
        const randomX = (Math.random() - 0.5) * 8; 
        const rotation = (Math.random() - 0.5) * 10;

        card.style.position = 'absolute';
        card.style.left = `calc(${baseLeft + randomX}% - ${cardWidthPx/2}px)`;
        card.style.top = `${this.colHeights[colIndex]}px`;
        card.style.transform = `rotate(${rotation}deg)`;
        card.style.zIndex = 10 + globalIndex;
        card.style.setProperty('--base-rotate', `${rotation}deg`);

        // 此时图片已加载，可以直接获取真实高度并更新列高度
        const height = card.offsetHeight;
        this.colHeights[colIndex] += height + gapY;
        this.container.style.height = `${Math.max(...this.colHeights) + 200}px`;
    }

    createCardDOM(item) {
        const card = document.createElement('div');
        const isMilestone = item.type === 'milestone';
        
        let classes = `photo-card group bg-white p-3 shadow-sm rounded-sm transition-all duration-500 ease-out cursor-pointer`;
        if (this.isDesktop) {
            classes += ` w-[300px] md:w-[320px] hover:scale-105 hover:-translate-y-4 hover:shadow-2xl hover:z-[100] hover:rotate-0`;
        } else {
            classes += ` w-full shadow-md`;
        }
        card.className = classes;

        // 点击卡片跳转到拍立得详情页
        card.onclick = () => {
            const params = new URLSearchParams({
                url: item.url,
                title: item.title,
                date: item.date,
                excerpt: item.excerpt
            });
            window.location.href = `polaroid.html?${params.toString()}`;
        };

        // 里程碑特殊标识
        const milestoneBadge = isMilestone ? `
            <div class="absolute -top-2 -right-2 bg-amber-400 text-white p-1.5 rounded-full shadow-lg z-20 animate-pulse">
                <i data-lucide="medal" class="w-4 h-4"></i>
            </div>
        ` : '';

        card.innerHTML = `
            <div class="relative overflow-hidden bg-slate-100 mb-3 group-hover:sepia-0 transition-all duration-500 shadow-inner">
                ${milestoneBadge}
                <img src="${item.url}" alt="${item.title}" loading="lazy" class="w-full h-auto object-cover transform group-hover:scale-110 transition-transform duration-700">
            </div>
            <div class="px-1 text-center">
                <h3 class="font-bold text-slate-800 mb-1 group-hover:text-baby-pink-deep transition-colors truncate text-sm sm:text-base">${item.title}</h3>
                <div class="text-[9px] tracking-widest text-slate-400 uppercase font-sans mb-2">${item.date.replace(/-/g, '.')}</div>
                <p class="text-xs text-slate-500 font-light leading-relaxed ${this.isDesktop ? 'opacity-0 h-0 group-hover:h-auto group-hover:opacity-100' : ''} transition-all duration-300 overflow-hidden line-clamp-2">
                    ${item.excerpt}
                </p>
            </div>
        `;

        if (window.lucide) {
            setTimeout(() => lucide.createIcons({ props: { "stroke-width": 3 }, nameAttr: "data-lucide", parent: card }), 0);
        }

        return card;
    }

    /**
     * 视差效果：让照片随鼠标轻微移动
     */
    bindParallax() {
        document.addEventListener('mousemove', (e) => {
            const x = (window.innerWidth - e.pageX * 2) / 100;
            const y = (window.innerHeight - e.pageY * 2) / 100;
            
            requestAnimationFrame(() => {
                this.container.style.transform = `translateX(${x}px) translateY(${y}px)`;
            });
        });
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', loadGalleryData);
