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
    if (!confirm('确定要永久删除这张示例照片吗？')) return;
    
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

// 表单提交逻辑
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(uploadForm);
    
    // 如果内容为空，填充默认值
    if (!formData.get('content')) {
        formData.set('content', '期待达成这个精彩瞬间 ✨');
    }

    // 按钮 Loading 态
    submitBtn.setAttribute('aria-busy', 'true');
    submitBtn.disabled = true;
    const originalContent = submitBtn.innerHTML;
    submitBtn.innerHTML = `
        <i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i>
        <span>正在保存...</span>
    `;
    lucide.createIcons();

    try {
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
            if (fileInput.files.length > 0) {
                const uploadFormData = new FormData();
                uploadFormData.append('entry_id', editId);
                Array.from(fileInput.files).forEach(file => {
                    uploadFormData.append('file', file);
                });
                await apiRequest('/upload', {
                    method: 'POST',
                    body: uploadFormData
                });
            }
        } else {
            // 新建模式
            const uploadFormData = new FormData(uploadForm);
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
        alert('保存失败: ' + err.message);
        submitBtn.innerHTML = originalContent;
        lucide.createIcons();
    } finally {
        submitBtn.setAttribute('aria-busy', 'false');
        submitBtn.disabled = false;
    }
});
