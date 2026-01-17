/**
 * polaroid.js - 处理拍立得页面的数据加载、导航与导出
 */

let allMediaItems = [];
let currentIndex = -1;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. 获取当前 URL 参数
    const params = new URLSearchParams(window.location.search);
    const initialUrl = params.get('url');

    if (!initialUrl) {
        alert('未找到图片信息');
        window.location.href = 'photos.html';
        return;
    }

    // 2. 加载所有数据以支持翻页
    await loadAllMedia(initialUrl);

    // 3. 绑定导出逻辑
    initExportLogic();

    // 4. 绑定导航逻辑
    initNavigation();

    // 5. 绑定编辑逻辑
    initEditLogic();
});

/**
 * 初始化编辑逻辑
 */
function initEditLogic() {
    const editBtn = document.getElementById('edit-btn');
    const editBtnText = document.getElementById('edit-btn-text');
    const editHint = document.getElementById('edit-hint');
    const editableEls = [
        document.getElementById('polaroid-title'),
        document.getElementById('polaroid-date'),
        document.getElementById('polaroid-excerpt')
    ];

    let isEditing = false;

    editBtn.addEventListener('click', () => {
        isEditing = !isEditing;

        if (isEditing) {
            // 进入编辑模式
            document.body.classList.add('is-editing');
            editableEls.forEach(el => el.contentEditable = "true");
            editBtnText.textContent = '完成编辑';
            
            // 切换按钮样式：移除默认白底样式，添加粉色高亮样式
            editBtn.classList.remove('bg-white', 'text-slate-600', 'border-slate-100', 'hover:bg-slate-50');
            editBtn.classList.add('bg-baby-pink', 'text-white', 'border-baby-pink', 'hover:bg-baby-pink-deep');
            
            editHint.classList.remove('hidden');
            editableEls[0].focus();
        } else {
            // 退出编辑模式
            document.body.classList.remove('is-editing');
            editableEls.forEach(el => el.contentEditable = "false");
            editBtnText.textContent = '编辑内容';
            
            // 恢复按钮样式
            editBtn.classList.remove('bg-baby-pink', 'text-white', 'border-baby-pink', 'hover:bg-baby-pink-deep');
            editBtn.classList.add('bg-white', 'text-slate-600', 'border-slate-100', 'hover:bg-slate-50');
            
            editHint.classList.add('hidden');
        }
        
        if (window.lucide) lucide.createIcons();
    });

    // 处理回车键阻止换行（针对标题和日期）
    [editableEls[0], editableEls[1]].forEach(el => {
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                el.blur();
            }
        });
    });
}

/**
 * 加载所有媒体数据
 */
async function loadAllMedia(initialUrl) {
    try {
        const entries = await apiRequest('/timeline?limit=1000');
        allMediaItems = [];
        entries.forEach(entry => {
            if (entry.media && entry.media.length > 0) {
                entry.media.forEach(m => {
                    allMediaItems.push({
                        url: m.url,
                        date: entry.date,
                        title: entry.title || (entry.type === 'milestone' ? '重要里程碑' : '日常瞬间'),
                        excerpt: entry.content || ''
                    });
                });
            }
        });

        // 找到当前索引
        currentIndex = allMediaItems.findIndex(item => item.url === initialUrl);
        if (currentIndex === -1) {
            // 如果没找到（可能是通过直接链接进入且数据有变），则手动添加当前项到第一位
            allMediaItems.unshift({
                url: initialUrl,
                title: new URLSearchParams(window.location.search).get('title') || '时光瞬间',
                date: new URLSearchParams(window.location.search).get('date') || '',
                excerpt: new URLSearchParams(window.location.search).get('excerpt') || ''
            });
            currentIndex = 0;
        }

        renderItem(currentIndex);
    } catch (err) {
        console.error('Failed to load media list:', err);
        // 如果加载全量数据失败，仅渲染当前项
        renderInitialOnly();
    }
}

/**
 * 渲染指定索引的项
 */
function renderItem(index) {
    const item = allMediaItems[index];
    if (!item) return;

    const imgEl = document.getElementById('polaroid-img');
    const titleEl = document.getElementById('polaroid-title');
    const dateEl = document.getElementById('polaroid-date');
    const excerptEl = document.getElementById('polaroid-excerpt');
    const captureArea = document.getElementById('capture-area');

    // 添加切换动画效果
    captureArea.classList.remove('animate-fade-in-up');
    void captureArea.offsetWidth; // 触发回流
    captureArea.classList.add('animate-fade-in-up');

    imgEl.crossOrigin = "anonymous";
    imgEl.src = item.url;
    titleEl.textContent = item.title;
    dateEl.textContent = item.date.replace(/-/g, '.');
    excerptEl.textContent = item.excerpt;

    updateNavButtons();
}

function renderInitialOnly() {
    const params = new URLSearchParams(window.location.search);
    const item = {
        url: params.get('url'),
        title: params.get('title') || '时光瞬间',
        date: params.get('date') || '',
        excerpt: params.get('excerpt') || ''
    };
    allMediaItems = [item];
    currentIndex = 0;
    renderItem(0);
}

/**
 * 更新导航按钮状态
 */
function updateNavButtons() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    if (prevBtn) prevBtn.style.opacity = currentIndex > 0 ? '1' : '0.3';
    if (nextBtn) nextBtn.style.opacity = currentIndex < allMediaItems.length - 1 ? '1' : '0.3';
}

/**
 * 初始化导航逻辑
 */
function initNavigation() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    const goPrev = () => {
        if (currentIndex > 0) {
            currentIndex--;
            renderItem(currentIndex);
        }
    };

    const goNext = () => {
        if (currentIndex < allMediaItems.length - 1) {
            currentIndex++;
            renderItem(currentIndex);
        }
    };

    if (prevBtn) prevBtn.addEventListener('click', goPrev);
    if (nextBtn) nextBtn.addEventListener('click', goNext);

    // 键盘支持
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') goPrev();
        if (e.key === 'ArrowRight') goNext();
    });

    // 移动端滑动支持
    let touchStartX = 0;
    document.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }, false);

    document.addEventListener('touchend', e => {
        const touchEndX = e.changedTouches[0].screenX;
        const diff = touchEndX - touchStartX;
        
        if (Math.abs(diff) > 50) { // 滑动阈值
            if (diff > 0) goPrev(); // 向右滑看上一张
            else goNext(); // 向左滑看下一张
        }
    }, false);
}

/**
 * 初始化导出逻辑
 */
function initExportLogic() {
    const downloadBtn = document.getElementById('download-btn');
    const captureArea = document.getElementById('capture-area');
    
    // 创建预览模态框（如果不存在）
    let previewModal = document.getElementById('preview-modal');
    if (!previewModal) {
        previewModal = document.createElement('div');
        previewModal.id = 'preview-modal';
        previewModal.className = 'fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 hidden opacity-0 transition-opacity duration-300';
        previewModal.innerHTML = `
            <div class="relative w-full max-w-lg flex flex-col items-center">
                <button id="close-preview" class="absolute -top-12 right-0 text-white p-2 hover:text-baby-pink transition-colors">
                    <i data-lucide="x" class="w-8 h-8"></i>
                </button>
                <img id="preview-img" class="w-full h-auto rounded-lg shadow-2xl mb-4" alt="Generated Polaroid">
                <p class="text-white/90 text-center text-sm font-medium bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">长按图片保存到相册</p>
            </div>
        `;
        document.body.appendChild(previewModal);
        
        // 绑定关闭事件
        const closeBtn = previewModal.querySelector('#close-preview');
        const closeFn = () => {
            previewModal.classList.remove('opacity-100');
            previewModal.classList.add('opacity-0');
            setTimeout(() => previewModal.classList.add('hidden'), 300);
        };
        
        closeBtn.addEventListener('click', closeFn);
        previewModal.addEventListener('click', (e) => {
            if (e.target === previewModal) closeFn();
        });
    }

    downloadBtn.addEventListener('click', async () => {
        if (downloadBtn.disabled) return;

        downloadBtn.disabled = true;
        const originalText = downloadBtn.innerHTML;
        downloadBtn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i><span>正在生成...</span>';
        if (window.lucide) lucide.createIcons();

        try {
            const imgEl = document.getElementById('polaroid-img');
            // 确保图片加载完成
            if (!imgEl.complete) {
                await new Promise((resolve) => {
                    imgEl.onload = resolve;
                    imgEl.onerror = resolve;
                    setTimeout(resolve, 3000); // 超时保护
                });
            }

            // 导出前临时移除编辑样式，确保导出的图片干净
            const wasEditing = document.body.classList.contains('is-editing');
            if (wasEditing) document.body.classList.remove('is-editing');

            // 等待样式应用
            await new Promise(resolve => setTimeout(resolve, 100));

            // 使用 html-to-image 导出
            // html-to-image 会使用 foreignObject 和浏览器自身的渲染引擎，支持 OKLCH 等现代 CSS
            const blob = await htmlToImage.toBlob(captureArea, {
                pixelRatio: Math.max(window.devicePixelRatio, 2),
                backgroundColor: null,
                style: {
                   margin: 0 // 防止可能的 margin 导致偏移
                }
            });

            // 恢复编辑样式
            if (wasEditing) document.body.classList.add('is-editing');

            const file = new File([blob], `baby-moment-${Date.now()}.png`, { type: 'image/png' });

            // 优先尝试原生分享 (移动端体验更好)
            let shared = false;
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: '珍贵瞬间',
                        text: '分享这个珍贵的瞬间'
                    });
                    shared = true;
                } catch (err) {
                    // 用户取消分享不视为错误
                    if (err.name !== 'AbortError') console.warn('Share failed:', err);
                }
            }

            // 如果没有分享（不支持或失败），则根据设备类型处理
            if (!shared) {
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                
                if (isMobile) {
                    // 移动端：显示预览图供长按保存
                    const previewImg = document.getElementById('preview-img');
                    // 创建 Object URL 替代 dataURL，性能更好
                    const url = URL.createObjectURL(blob);
                    previewImg.src = url;
                    previewImg.onload = () => URL.revokeObjectURL(url);
                    
                    previewModal.classList.remove('hidden');
                    // 强制回流
                    void previewModal.offsetWidth;
                    previewModal.classList.remove('opacity-0');
                    previewModal.classList.add('opacity-100');
                    
                    if (window.lucide) lucide.createIcons();
                } else {
                    // 桌面端：直接下载
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.download = `baby-polaroid-${Date.now()}.png`;
                    link.href = url;
                    link.click();
                    URL.revokeObjectURL(url);

                    const toast = document.getElementById('success-toast');
                    toast.classList.remove('opacity-0');
                    toast.classList.add('opacity-100', '-translate-y-4');
                    setTimeout(() => {
                        toast.classList.remove('opacity-100', '-translate-y-4');
                        toast.classList.add('opacity-0');
                    }, 3000);
                }
            }

        } catch (err) {
            console.error('Export failed:', err);
            alert('导出失败，请尝试截图保存');
        } finally {
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = originalText;
            if (window.lucide) lucide.createIcons();
        }
    });
}
