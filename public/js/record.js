/**
 * record.js - 针对已完成内容的增加/编辑 (status=completed)
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
const typeToggle = document.getElementById('type-toggle');
const typeHidden = document.getElementById('type-hidden');

let existingMediaCount = 0;

async function init() {
    if (editId) {
        await loadExistingData();
        const titleEl = document.querySelector('h1');
        const descEl = document.querySelector('p.text-slate-500');
        const submitText = submitBtn.querySelector('span');
        if (titleEl) titleEl.textContent = "📝 修订美好";
        if (descEl) descEl.textContent = "让记忆更加准确完美";
        if (submitText) submitText.textContent = "保存修订";
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
        
        if (entry.type === 'milestone') {
            if (typeToggle) typeToggle.checked = true;
            if (typeHidden) typeHidden.value = 'milestone';
        }

        // 渲染旧照片
        if (entry.media && entry.media.length > 0) {
            existingMediaCount = entry.media.length;
            entry.media.forEach((m, index) => {
                renderPhotoCard(m.url, m.id, index);
            });
            uploadArea.classList.add('hidden');
            previewArea.classList.remove('hidden');
        }
    } catch (err) {
        console.error('Load data failed:', err);
        alert('加载数据失败: ' + err.message);
    }
}

// 里程碑切换
if (typeToggle && typeHidden) {
    typeToggle.addEventListener('change', (e) => {
        typeHidden.value = e.target.checked ? 'milestone' : 'daily';
    });
}

// 渲染照片卡片
function renderPhotoCard(url, mediaId = null, index = 0) {
    const rotate = (index % 2 === 0 ? '-rotate-2' : 'rotate-2');
    const polaroid = document.createElement('div');
    polaroid.className = `polaroid-preview w-32 sm:w-40 ${rotate} transform transition-all relative group/photo`;
    
    let deleteHtml = '';
    if (mediaId) {
        deleteHtml = `
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center z-30">
                <button type="button" onclick="deleteExistingPhoto(${mediaId}, this)" class="bg-rose-500 text-white p-2 rounded-full hover:scale-110 transition-transform shadow-lg">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        `;
    }

    polaroid.innerHTML = `
        <div class="aspect-square bg-slate-100 overflow-hidden mb-2 relative">
            <img src="${url}" class="w-full h-full object-cover">
            ${deleteHtml}
        </div>
    `;
    previewContainer.appendChild(polaroid);
    if(window.lucide) lucide.createIcons();
}

// 删除旧照片
async function deleteExistingPhoto(mediaId, btn) {
    if (!confirm('确定要永久删除这张照片吗？')) return;
    
    try {
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i>';
        lucide.createIcons();

        await apiRequest(`/media/${mediaId}`, { method: 'DELETE' });
        
        btn.closest('.polaroid-preview').remove();
        existingMediaCount--;
        
        if (existingMediaCount === 0 && fileInput.files.length === 0) {
            uploadArea.classList.remove('hidden');
            previewArea.classList.add('hidden');
        }
    } catch (err) {
        alert('删除失败: ' + err.message);
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        lucide.createIcons();
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
        if (!editId || (existingMediaCount === 0 && previewContainer.children.length === 0)) {
            previewContainer.innerHTML = '';
        }
        
        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function(event) {
                renderPhotoCard(event.target.result, null, index + existingMediaCount);
            }
            reader.readAsDataURL(file);
        });
        
        uploadArea.classList.add('hidden');
        previewArea.classList.remove('hidden');
    }
});

// 重新选择
reselectBtn.addEventListener('click', function() {
    if (editId) {
        fileInput.value = '';
        const cards = previewContainer.querySelectorAll('.polaroid-preview');
        cards.forEach(card => {
            if (!card.querySelector('button[onclick^="deleteExistingPhoto"]')) {
                card.remove();
            }
        });
        if (existingMediaCount > 0) {
            uploadArea.classList.add('hidden');
            previewArea.classList.remove('hidden');
        } else {
            uploadArea.classList.remove('hidden');
            previewArea.classList.add('hidden');
        }
    } else {
        fileInput.value = ''; 
        previewContainer.innerHTML = '';
        uploadArea.classList.remove('hidden');
        previewArea.classList.add('hidden');
    }
});

// 表单提交
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
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

    const formData = new FormData(uploadForm);
    
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
        const rawFiles = Array.from(fileInput.files);
        const compressedFiles = await Promise.all(rawFiles.map(file => compressImage(file)));

        if (editId) {
            const updateData = {
                id: parseInt(editId),
                title: formData.get('title'),
                content: formData.get('content'),
                date: formData.get('date'),
                type: formData.get('type'),
                status: 'completed'
            };

            await apiRequest('/entry', {
                method: 'POST',
                body: JSON.stringify(updateData)
            });

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
            const uploadFormData = new FormData(uploadForm);
            
            // 替换为压缩后的文件
            if (compressedFiles.length > 0) {
                uploadFormData.delete('file');
                compressedFiles.forEach(file => {
                    uploadFormData.append('file', file, file.name);
                });
            }

            uploadFormData.set('status', 'completed');
            
            await apiRequest('/upload', {
                method: 'POST',
                body: uploadFormData
            });
        }

        submitBtn.innerHTML = `
            <i data-lucide="check-circle-2" class="w-5 h-5"></i>
            <span>保存成功！</span>
        `;
        submitBtn.classList.remove('bg-baby-pink-deep');
        submitBtn.classList.add('bg-green-500');
        lucide.createIcons();
        
        setTimeout(() => {
            window.location.href = 'timeline.html';
        }, 800);

    } catch (err) {
        console.error('Operation failed:', err);
        alert('保存失败: ' + err.message);
        submitBtn.innerHTML = originalContent;
        lucide.createIcons();
    } finally {
        submitBtn.setAttribute('aria-busy', 'false');
        submitBtn.disabled = false;
    }
});
