/**
 * plan.js - 针对未完成里程碑的增加/编辑 (status=pending)
 */

const uploadForm = document.getElementById('upload-form');
const fileInput = document.getElementById('file');
const uploadArea = document.getElementById('upload-area');
const previewArea = document.getElementById('preview-area');
const previewContainer = document.getElementById('preview-container');
const reselectBtn = document.getElementById('reselect-btn');
const addMoreBtn = document.getElementById('add-more-btn');
const submitBtn = document.getElementById('submit-btn');

// --- 状态管理 ---
const urlParams = new URLSearchParams(window.location.search);
const editId = urlParams.get('id');

let existingMediaCount = 0;
let selectedFiles = []; // 存储新选择的文件

async function init() {
    if (editId) {
        await loadExistingData();
        const titleEl = document.querySelector('h1');
        const submitText = submitBtn.querySelector('span');
        if (titleEl) titleEl.textContent = "✨ 修订期待";
        if (submitText) submitText.textContent = "保存期待";
    }
}

init();

/**
 * 加载现有数据 (编辑模式)
 */
async function loadExistingData() {
    try {
        const data = await apiRequest('/timeline');
        const entry = data.find(e => e.id == editId);
        if (!entry) throw new Error('未找到该条目');

        // 填充表单
        document.getElementById('title').value = entry.title || '';
        document.getElementById('content').value = entry.content || '';
        
        const dateObj = new Date(entry.date);
        const offset = dateObj.getTimezoneOffset() * 60000;
        const localTime = new Date(dateObj - offset).toISOString().slice(0, 16);
        document.getElementById('date').value = localTime;

        // 渲染旧照片 (示例图)
        if (entry.media && entry.media.length > 0) {
            previewContainer.innerHTML = ''; // 清空可能存在的旧内容
            existingMediaCount = entry.media.length;
            entry.media.forEach((m, index) => {
                renderPhotoCard(m.url, m.id, index);
            });
            uploadArea.classList.add('hidden');
            previewArea.classList.remove('hidden');
        }
        
    } catch (err) {
        console.error('Load data failed:', err);
        showToast('加载数据失败: ' + err.message, 'error');
    }
}

// 渲染照片卡片
function renderPhotoCard(url, mediaId = null, index = 0, fileObj = null) {
    const rotate = (index % 2 === 0 ? '-rotate-2' : 'rotate-2');
    const polaroid = document.createElement('div');
    polaroid.className = `polaroid-preview w-32 sm:w-40 ${rotate} transform transition-all relative group/photo cursor-pointer`;
    
    // 点击事件
    polaroid.onclick = () => handlePhotoClick(mediaId, fileObj, polaroid);

    polaroid.innerHTML = `
        <div class="aspect-square bg-slate-100 overflow-hidden mb-2 relative pointer-events-none">
            <img src="${url}" class="w-full h-full object-cover">
             <div class="absolute inset-0 bg-black/0 group-hover/photo:bg-black/10 transition-colors flex items-center justify-center">
                <div class="opacity-0 group-hover/photo:opacity-100 bg-red-500/80 text-white rounded-full p-2 transform scale-75 group-hover/photo:scale-100 transition-all">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </div>
            </div>
        </div>
    `;
    previewContainer.appendChild(polaroid);
    if(window.lucide) lucide.createIcons();
}

// 处理照片点击（删除）
async function handlePhotoClick(mediaId, fileObj, element) {
    const confirmed = await showConfirm({
        title: '删除照片',
        message: '确定要删除这张照片吗？',
        type: 'danger'
    });
    
    if (!confirmed) return;

    if (mediaId) {
        // 删除已存在的照片
        await deleteExistingPhoto(mediaId, element);
    } else if (fileObj) {
        // 删除新添加的照片
        deleteNewPhoto(fileObj, element);
    }
}

// 删除新照片
function deleteNewPhoto(fileObj, element) {
    const idx = selectedFiles.indexOf(fileObj);
    if (idx > -1) {
        selectedFiles.splice(idx, 1);
        element.remove();
        
        // 如果没有照片了，显示上传区域
        if (existingMediaCount === 0 && selectedFiles.length === 0) {
            uploadArea.classList.remove('hidden');
            previewArea.classList.add('hidden');
        }
    }
}

// 删除旧照片
async function deleteExistingPhoto(mediaId, element) {
    try {
        // 由于点击的是整个卡片，我们可以在 UI 上给点反馈，比如变灰
        element.style.opacity = '0.5';
        element.style.pointerEvents = 'none';

        await apiRequest(`/media/${mediaId}`, { method: 'DELETE' });
        
        element.remove();
        existingMediaCount--;
        
        if (existingMediaCount === 0 && selectedFiles.length === 0) {
            uploadArea.classList.remove('hidden');
            previewArea.classList.add('hidden');
        }
    } catch (err) {
        showToast('删除失败: ' + err.message, 'error');
        element.style.opacity = '1';
        element.style.pointerEvents = 'auto';
    }
}
window.deleteExistingPhoto = deleteExistingPhoto;

// 继续添加
if (addMoreBtn) {
    addMoreBtn.addEventListener('click', () => {
        fileInput.click();
    });
}

// 监听文件选择
fileInput.addEventListener('change', function(e) {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
        files.forEach((file) => {
            selectedFiles.push(file); // 添加到全局数组
            const reader = new FileReader();
            reader.onload = function(event) {
                renderPhotoCard(event.target.result, null, existingMediaCount + selectedFiles.length, file);
            }
            reader.readAsDataURL(file);
        });
        
        uploadArea.classList.add('hidden');
        previewArea.classList.remove('hidden');
        
        fileInput.value = ''; // 清空 input
    }
});

// 重新选择
reselectBtn.addEventListener('click', function() {
    selectedFiles = [];
    fileInput.value = '';
    
    if (editId) {
        loadExistingData(); // 重新加载以恢复旧状态
    } else {
        previewContainer.innerHTML = '';
        uploadArea.classList.remove('hidden');
        previewArea.classList.add('hidden');
    }
});

// 表单提交逻辑
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(uploadForm);
    
    // 如果内容为空，填充默认值
    if (!formData.get('content')) {
        formData.set('content', '期待达成这个精彩瞬间 ✨');
    }

    // 修复时区问题：构造 ISO UTC 时间字符串覆盖 FormData
    const userDateVal = document.getElementById('date').value;
    if (userDateVal) {
        const d = new Date(userDateVal);
        formData.set('date', d.toISOString());
    }

    // 压缩图片辅助函数
    const compressImage = (file) => {
        return new Promise((resolve) => {
            new Compressor(file, {
                quality: 0.6,
                maxWidth: 1920,
                maxHeight: 1920,
                success(result) {
                    resolve(result);
                },
                error(err) {
                    console.warn('Compression failed, using original:', err);
                    resolve(file);
                },
            });
        });
    };

    // 按钮 Loading 态
    submitBtn.setAttribute('aria-busy', 'true');
    submitBtn.disabled = true;
    const originalContent = submitBtn.innerHTML;
    submitBtn.innerHTML = `
        <i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i>
        <span>正在优化并保存...</span>
    `;
    lucide.createIcons();

    try {
        // 预处理：压缩所有选中的图片
        // const rawFiles = Array.from(fileInput.files);
        const rawFiles = selectedFiles; // NEW
        const compressedFiles = await Promise.all(rawFiles.map(file => compressImage(file)));

        if (editId) {
            // 编辑模式
            const updateData = {
                id: parseInt(editId),
                title: formData.get('title'),
                content: formData.get('content'),
                date: formData.get('date'),
                type: 'milestone',
                status: 'pending'
            };

            await apiRequest('/entry', {
                method: 'POST',
                body: JSON.stringify(updateData)
            });

            // 如果有新照片上传
            if (compressedFiles.length > 0) {
                const uploadFormData = new FormData();
                uploadFormData.append('entry_id', editId);
                compressedFiles.forEach(file => {
                    uploadFormData.append('file', file, file.name);
                });
                await apiRequest('/upload', {
                    method: 'POST',
                    body: uploadFormData
                });
            }
        } else {
            // 新建模式
            const uploadFormData = new FormData(uploadForm);
            
            // 替换为压缩后的文件
            if (compressedFiles.length > 0) {
                uploadFormData.delete('file');
                compressedFiles.forEach(file => {
                    uploadFormData.append('file', file, file.name);
                });
            }

            uploadFormData.set('status', 'pending');
            uploadFormData.set('type', 'milestone');
            
            await apiRequest('/upload', {
                method: 'POST',
                body: uploadFormData
            });
        }

        // 成功反馈
        submitBtn.innerHTML = `
            <i data-lucide="check-circle-2" class="w-5 h-5"></i>
            <span>保存成功！</span>
        `;
        submitBtn.classList.remove('bg-baby-pink-deep');
        submitBtn.classList.add('bg-green-500');
        lucide.createIcons();
        
        setTimeout(() => {
            window.location.href = 'milestones.html';
        }, 800);

    } catch (err) {
        console.error('Operation failed:', err);
        showToast('保存失败: ' + err.message, 'error');
        submitBtn.innerHTML = originalContent;
        lucide.createIcons();
    } finally {
        submitBtn.setAttribute('aria-busy', 'false');
        submitBtn.disabled = false;
    }
});
