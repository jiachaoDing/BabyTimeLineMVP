/**
 * photos.js - 接入真实数据与懒加载
 */

let allMediaItems = []; // 当前已加载的所有媒体项
let currentPage = 1;
let hasMore = true;
let isLoading = false;
let renderedCount = 0;   // 已渲染的数量
const PAGE_SIZE = 20;    // 每次加载20条
let galleryInstance = null;
let currentSearch = '';
let currentType = 'all';

/**
 * 1. 数据获取与处理
 */
async function loadGalleryData() {
    const loader = document.getElementById('gallery-loader');
    
    // 0. 尝试优先加载本地缓存 (仅当没有搜索条件时)
    const cachedGallery = localStorage.getItem('gallery_cache_data');
    if (!currentSearch && currentType === 'all' && cachedGallery) {
        try {
            const parsed = JSON.parse(cachedGallery);
            if (parsed.length > 0) {
                if (loader) loader.classList.add('hidden');
                initGalleryWithData(parsed);
                console.log('Gallery loaded from local cache');
            }
        } catch (e) {
            console.warn('Cache parse failed:', e);
            localStorage.removeItem('gallery_cache_data');
        }
    }

    try {
        // 如果有搜索条件，直接跳过同步检查，强制拉取新数据
        if (!currentSearch && currentType === 'all') {
            // 1. 检查数据同步状态
            const syncRes = await apiRequest('/sync-check');
            const lastUpdated = syncRes.last_updated;
            const localLastUpdated = localStorage.getItem('gallery_last_updated');

            // 如果本地有缓存且时间戳一致，直接使用缓存
            if (cachedGallery && lastUpdated && lastUpdated === localLastUpdated) {
                 console.log('Gallery is up-to-date');
                 if (loader) loader.classList.add('hidden');
                 // 如果尚未渲染（比如刚进页面，或者之前缓存加载时被意外中断），则进行初始化
                 if (renderedCount === 0) {
                     const parsed = JSON.parse(cachedGallery);
                     initGalleryWithData(parsed);
                 }
                 return;
            }
        }

        // 2. 获取第一页数据
        console.log(`Fetching new gallery data (page 1)... Search: ${currentSearch}, Type: ${currentType}`);
        currentPage = 1;
        hasMore = true;
        
        const params = new URLSearchParams({
            page: currentPage,
            limit: PAGE_SIZE,
            search: currentSearch,
            type: currentType
        });
        
        const entries = await apiRequest(`/timeline?${params.toString()}`);
        
        // 3. 展开数据
        const newMediaItems = processEntries(entries);

        // 4. 写入缓存和时间戳 (仅当无搜索条件时才缓存，避免搜索结果覆盖全量缓存)
        if (!currentSearch && currentType === 'all') {
            try {
                localStorage.setItem('gallery_cache_data', JSON.stringify(newMediaItems));
                // 获取最新时间戳以同步
                const syncRes = await apiRequest('/sync-check');
                if (syncRes.last_updated) {
                    localStorage.setItem('gallery_last_updated', syncRes.last_updated);
                }
            } catch (e) {
                console.warn('Cache quota exceeded:', e);
            }
        }

        // 5. 渲染逻辑
        // 如果有搜索条件，强制重新初始化
        // 如果是首次加载（renderedCount=0），直接用新数据初始化。
        if (currentSearch || currentType !== 'all' || renderedCount === 0) {
            if (loader) loader.classList.add('hidden');
            
            // 搜索结果需要完全重置画廊状态
            if (currentSearch || currentType !== 'all') {
                const root = document.getElementById('gallery-root');
                const loaderEl = document.getElementById('gallery-loader');
                root.innerHTML = '';
                if(loaderEl) root.appendChild(loaderEl);
                // 重置渲染计数和布局引擎
                renderedCount = 0;
                // 注意：这里需要确保 ArtisticGallery 实例被重置或清空
                // 简单的方式是每次都 new 一个新的，或者在 initGalleryWithData 里处理
            }
            
            initGalleryWithData(newMediaItems);
        }

    } catch (err) {
        console.error('Failed to load gallery:', err);
        if ((!cachedGallery || currentSearch) && loader) {
            loader.innerHTML = `<p class="text-rose-500">加载失败: ${err.message}</p>`;
        }
    }
}

function initFilters() {
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');
    const searchConfirm = document.getElementById('search-confirm');
    const typeFilter = document.getElementById('type-filter');

    const doSearch = () => {
        currentSearch = searchInput.value;
        loadGalleryData(); // 重新加载
    };

    if (searchInput) {
        // 监听回车键
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                doSearch();
            }
        });
        
        // 监听输入，控制清空按钮显示
        searchInput.addEventListener('input', (e) => {
            if (e.target.value.length > 0) {
                searchClear?.classList.remove('hidden');
            } else {
                searchClear?.classList.add('hidden');
            }
        });
    }

    if (searchClear) {
        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            searchClear.classList.add('hidden');
            doSearch();
        });
    }

    if (searchConfirm) {
        searchConfirm.addEventListener('click', doSearch);
    }

    if (typeFilter) {
        typeFilter.addEventListener('change', (e) => {
            currentType = e.target.value;
            doSearch(); 
        });
    }
}

function processEntries(entries) {
    const mediaItems = [];
    entries.forEach(entry => {
        if (entry.media && entry.media.length > 0) {
            entry.media.forEach(m => {
                mediaItems.push({
                    id: m.id,
                    url: m.url,
                    date: entry.date,
                    title: entry.title || (entry.type === 'milestone' ? '重要里程碑' : '日常瞬间'),
                    excerpt: entry.content || '',
                    type: entry.type,
                    aspectRatio: 1 
                });
            });
        }
    });
    return mediaItems;
}

function initGalleryWithData(items) {
    allMediaItems = items;
    renderedCount = 0; // 重置渲染计数

    if (allMediaItems.length === 0) {
        renderEmptyState();
        return;
    }

    // 清空现有容器（防止重复渲染）
    const root = document.getElementById('gallery-root');
    // 保留 loader 结构如果需要，或者直接清空
    const loader = document.getElementById('gallery-loader');
    root.innerHTML = ''; 
    if(loader) root.appendChild(loader); 

    // 初始化画廊组件
    galleryInstance = new ArtisticGallery('gallery-root');
    renderNextBatch(); // 渲染当前已有的数据

    // 绑定滚动加载
    initInfiniteScroll();
}

/**
 * 2. 懒加载逻辑 (包含网络请求)
 */
async function loadMoreData() {
    if (isLoading || !hasMore) return;
    isLoading = true;

    try {
        const nextPage = currentPage + 1;
        
        const params = new URLSearchParams({
            page: nextPage,
            limit: PAGE_SIZE,
            search: currentSearch,
            type: currentType
        });

        const entries = await apiRequest(`/timeline?${params.toString()}`);
        
        if (!entries || entries.length === 0) {
            hasMore = false;
            updateInfiniteScrollTrigger();
        } else {
            const newItems = processEntries(entries);
            if (newItems.length === 0) {
                // 如果这一页没有图片，继续尝试加载下一页
                currentPage = nextPage;
                isLoading = false;
                loadMoreData(); // 递归调用
                return;
            }

            allMediaItems = [...allMediaItems, ...newItems];
            currentPage = nextPage;
            
            // 追加到缓存 (仅当无搜索条件时)
            if (!currentSearch && currentType === 'all') {
                try {
                    localStorage.setItem('gallery_cache_data', JSON.stringify(allMediaItems));
                } catch (e) {
                    console.warn('Cache quota exceeded, unable to save more items:', e);
                }
            }

            await galleryInstance.appendItems(newItems);
            renderedCount += newItems.length;
        }
    } catch (err) {
        console.error('Failed to load more gallery data:', err);
    } finally {
        isLoading = false;
    }
}

// 渲染当前内存中已有的数据 (用于初始渲染)
async function renderNextBatch() {
    if (renderedCount >= allMediaItems.length) return;
    
    // 这里其实是将所有初始数据一次性渲染（因为本身就是一页数据）
    const nextBatch = allMediaItems.slice(renderedCount);
    renderedCount += nextBatch.length;
    
    await galleryInstance.appendItems(nextBatch);
    updateInfiniteScrollTrigger();
}

function updateInfiniteScrollTrigger() {
    const trigger = document.getElementById('infinite-scroll-trigger');
    if (!trigger) return;

    if (!hasMore) {
        trigger.innerHTML = '<p class="text-slate-300 text-xs py-10 italic">✨ 已展示所有珍贵回忆 ✨</p>';
    } else {
        trigger.innerHTML = `
            <div class="flex gap-1.5">
                <div class="w-1.5 h-1.5 bg-baby-pink rounded-full animate-bounce"></div>
                <div class="w-1.5 h-1.5 bg-baby-pink rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div class="w-1.5 h-1.5 bg-baby-pink rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
        `;
    }
}

function initInfiniteScroll() {
    const trigger = document.getElementById('infinite-scroll-trigger');
    if (!trigger) return;

    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !isLoading) {
            loadMoreData();
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
document.addEventListener('DOMContentLoaded', () => {
    // 绑定搜索事件
    if (document.getElementById('search-input')) {
        initFilters();
    } else {
        document.addEventListener('header-loaded', initFilters);
    }
    loadGalleryData();
});
