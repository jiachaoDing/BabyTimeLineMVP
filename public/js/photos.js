/**
 * photos.js - 核心画廊逻辑
 * 功能：
 * 1. 管理 Mock 数据 / 真实 API 数据
 * 2. 桌面端 "Artistic Scatter" 布局算法
 * 3. 移动端 Grid 布局适配
 * 4. 交互动效管理
 */

// ==========================================
// 1. 数据层 (Data Layer)
// ==========================================

// Mock Data: 模拟 24 张宝宝照片
// TODO: 未来接入 API 时，保持字段结构一致
const generateMockData = () => {
    const items = [];
    const baseDate = new Date();
    
    for (let i = 1; i <= 24; i++) {
        // 使用 Picsum 获取随机唯美图片，增加随机宽高比模拟真实照片差异
        const width = 400;
        const height = Math.random() > 0.5 ? 500 : 400; // 随机竖构图或方构图
        
        items.push({
            id: i,
            // 注意：picsum 只是占位，真实环境请替换为 CDN 图片链接
            url: `https://picsum.photos/${width}/${height}?random=${i}`,
            date: new Date(baseDate.getTime() - i * 86400000 * 7).toISOString().split('T')[0], // 每周一张
            title: i === 1 ? "第一次叫妈妈" : (i % 5 === 0 ? "满月快乐" : "日常碎片"),
            excerpt: "阳光很好的下午，你笑得像个小天使，手里紧紧抓着那个破旧的小熊玩偶不肯放。",
            aspectRatio: width / height
        });
    }
    return items;
};

// ==========================================
// 2. 布局算法 (Layout Algorithm)
// ==========================================

class ArtisticGallery {
    constructor(containerId, data) {
        this.container = document.getElementById(containerId);
        this.loader = document.getElementById('gallery-loader');
        this.data = data;
        this.isDesktop = window.innerWidth >= 1024; // lg breakpoint
        
        this.init();
    }

    init() {
        // 移除 loader
        if(this.loader) this.loader.remove();
        
        // 绑定窗口变化事件 (防抖)
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => this.handleResize(), 200);
        });

        // 绑定鼠标视差效果 (仅桌面)
        if (this.isDesktop) {
            this.bindParallax();
        }

        // 初始渲染
        this.render();
    }

    handleResize() {
        const currentIsDesktop = window.innerWidth >= 1024;
        // 只有当断点跨越时才重新完整渲染，否则只是 CSS 响应式调整
        if (currentIsDesktop !== this.isDesktop) {
            this.isDesktop = currentIsDesktop;
            this.render();
        }
    }

    // 主渲染入口
    render() {
        this.container.innerHTML = ''; // 清空容器
        
        if (this.isDesktop) {
            this.renderDesktopLayout();
        } else {
            this.renderMobileLayout();
        }
    }

    /**
     * 移动端布局：使用 CSS Grid (Tailwind Classes)
     * 简单、整洁、高效
     */
    renderMobileLayout() {
        this.container.style.height = 'auto';
        this.container.className = 'grid grid-cols-1 sm:grid-cols-2 gap-6 p-2';

        this.data.forEach(item => {
            const card = this.createCardDOM(item, false);
            this.container.appendChild(card);
        });
    }

    /**
     * 桌面端布局：艺术散落 (Artistic Scatter)
     * 核心逻辑：
     * 1. 将容器分为 3-4 列的虚拟网格
     * 2. 在每个网格内放置照片，但加入随机偏移 (Translation) 和旋转 (Rotation)
     * 3. 记录每列的高度，实现类似 Masonry 的堆叠
     */
    renderDesktopLayout() {
        // 重置容器样式为 relative 以便绝对定位子元素
        this.container.className = 'relative w-full max-w-[1200px] mx-auto';
        
        const colCount = 3; // 3 列布局看起来最舒服
        const colWidth = 100 / colCount; // 百分比
        const colHeights = [0, 0, 0]; // 记录每一列当前的像素高度
        const cardWidthPx = 320; // 基准卡片宽度
        const gapY = 120; // 垂直间距，大一点更有呼吸感

        this.data.forEach((item, index) => {
            // 1. 找到当前高度最小的那一列
            const colIndex = colHeights.indexOf(Math.min(...colHeights));
            
            // 2. 计算基础位置
            // 左边距：列位置 + 居中偏移 + 随机扰动
            const baseLeft = (colIndex * 33.33) + 16.66; // 每一列的中心点百分比
            // 随机 X 偏移：-4% 到 +4%
            const randomX = (Math.random() - 0.5) * 8; 
            
            // 3. 计算旋转
            // 随机角度：-6deg 到 +6deg，营造散落感
            const rotation = (Math.random() - 0.5) * 12;

            // 4. 计算 Z-Index
            // 基础 z-index 10，hover 时会由 CSS 改为 50
            const zIndex = 10 + index; 

            // 5. 生成 DOM
            const card = this.createCardDOM(item, true);
            
            // 6. 应用定位样式
            card.style.position = 'absolute';
            card.style.left = `calc(${baseLeft + randomX}% - ${cardWidthPx/2}px)`;
            card.style.top = `${colHeights[colIndex]}px`;
            card.style.transform = `rotate(${rotation}deg)`;
            card.style.zIndex = zIndex;
            
            // 存储初始旋转角度供 hover 恢复使用 (CSS 变量)
            card.style.setProperty('--base-rotate', `${rotation}deg`);

            this.container.appendChild(card);

            // 7. 更新该列高度
            // 估算卡片高度：宽度 / 比例 + 底部文字区域 + padding
            const estimatedHeight = (cardWidthPx / item.aspectRatio) + 100; 
            colHeights[colIndex] += estimatedHeight + gapY + (Math.random() * 40); // 加上随机间距
        });

        // 设置容器总高度，防止 footer 塌陷
        this.container.style.height = `${Math.max(...colHeights) + 200}px`;
    }

    /**
     * 创建单张卡片的 DOM 结构
     * @param {Object} item 数据对象
     * @param {Boolean} isDesktop 是否为桌面模式 (决定样式复杂度)
     */
    createCardDOM(item, isDesktop) {
        const card = document.createElement('div');
        
        // 基础样式类
        let baseClasses = `
            photo-card group bg-white p-3 shadow-sm rounded-sm
            transition-all duration-500 ease-out cursor-pointer
        `;
        
        if (isDesktop) {
            // 桌面端特有样式：Hover 上浮、变正、阴影加深、缩放
            // 注意：hover:rotate-0 会让它回正
            baseClasses += `
                w-[300px] md:w-[320px]
                hover:scale-105 hover:-translate-y-4 hover:shadow-2xl hover:z-50 hover:rotate-0
                hover:bg-white
            `;
        } else {
            // 移动端样式
            baseClasses += `w-full mb-4 shadow-md`;
        }
        
        card.className = baseClasses;

        // 图片容器
        const imgContainer = document.createElement('div');
        imgContainer.className = "relative overflow-hidden bg-slate-100 aspect-auto mb-3 filter sepia-[0.1] group-hover:sepia-0 transition-all duration-500";
        // 模拟拍立得方框
        
        const img = document.createElement('img');
        img.src = item.url;
        img.alt = item.title;
        img.loading = "lazy";
        img.className = "w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700";
        
        imgContainer.appendChild(img);

        // 信息区
        const info = document.createElement('div');
        info.className = "px-1 text-center";
        
        // 标题 (手写体感觉)
        const title = document.createElement('h3');
        title.className = "font-serif text-lg text-slate-800 mb-1 group-hover:text-rose-400 transition-colors";
        title.textContent = item.title || "Untitled";

        // 日期
        const date = document.createElement('div');
        date.className = "text-[10px] tracking-widest text-slate-400 uppercase font-sans mb-2";
        date.textContent = item.date;

        // 摘要 (桌面端 Hover 显示，移动端常驻)
        const excerpt = document.createElement('p');
        excerpt.className = `
            text-xs text-slate-500 font-light leading-relaxed
            ${isDesktop ? 'opacity-0 h-0 group-hover:h-auto group-hover:opacity-100' : 'opacity-100'}
            transition-all duration-300 delay-100 overflow-hidden
        `;
        excerpt.textContent = item.excerpt;

        info.appendChild(title);
        info.appendChild(date);
        info.appendChild(excerpt);

        card.appendChild(imgContainer);
        card.appendChild(info);

        return card;
    }

    /**
     * 视差效果：让照片随鼠标轻微移动
     */
    bindParallax() {
        document.addEventListener('mousemove', (e) => {
            const x = (window.innerWidth - e.pageX * 2) / 100;
            const y = (window.innerHeight - e.pageY * 2) / 100;
            
            // 只有当容器在视口内时才应用，避免性能浪费
            requestAnimationFrame(() => {
                this.container.style.transform = `translateX(${x}px) translateY(${y}px)`;
            });
        });
    }
}

// ==========================================
// 3. 初始化入口 (Entry Point)
// ==========================================

// 模拟 API 调用
// 未来在这里替换为 fetch('/api/timeline')
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. 获取数据
    const mediaItems = generateMockData();

    // 2. 暴露渲染接口给全局 (方便后续对接)
    window.renderGallery = (data) => {
        new ArtisticGallery('gallery-root', data);
    };

    // 3. 启动
    window.renderGallery(mediaItems);
});