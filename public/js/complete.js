/**
 * complete.js - 将未完成里程碑标记为完成 (pending -> completed)
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

async function init() {
    if (!editId) {
        alert('参数错误');
        window.location.href = 'milestones.html';
        return;
    }
    await loadExistingData();
}

init();

/**
 * 加载现有数据
 */
async function loadExistingData() {
    try {
        const data = await apiRequest('/timeline');
        const entry = data.find(e => e.id == editId);
        if (!entry) throw new Error('未找到该条目');

        // 填充表单
        document.getElementById('title').value = entry.title || '';
        document.getElementById('content').value = entry.content || '';
        
        const dateObj = new Date(); // 默认今天
        const offset = dateObj.getTimezoneOffset() * 60000;
        const localTime = new Date(dateObj - offset).toISOString().slice(0, 16);
        document.getElementById('date').value = localTime;
        
    } catch (err) {
        console.error('Load data failed:', err);
        alert('加载数据失败: ' + err.message);
    }
}

// 渲染照片卡片
function renderPhotoCard(url, index = 0) {
    const rotate = (index % 2 === 0 ? '-rotate-2' : 'rotate-2');
    const polaroid = document.createElement('div');
    polaroid.className = `polaroid-preview w-32 sm:w-40 ${rotate} transform transition-all relative group/photo`;
    
    polaroid.innerHTML = `
        <div class="aspect-square bg-slate-100 overflow-hidden mb-2 relative">
            <img src="${url}" class="w-full h-full object-cover">
        </div>
    `;
    previewContainer.appendChild(polaroid);
}

// 继续添加按钮
if (addMoreBtn) {
    addMoreBtn.addEventListener('click', () => {
        fileInput.click();
    });
}

// 监听文件选择
fileInput.addEventListener('change', function(e) {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
        previewContainer.innerHTML = '';
        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function(event) {
                renderPhotoCard(event.target.result, index);
            }
            reader.readAsDataURL(file);
        });
        
        uploadArea.classList.add('hidden');
        previewArea.classList.remove('hidden');
    }
});

// 重新选择图片
reselectBtn.addEventListener('click', function() {
    fileInput.value = ''; 
    previewContainer.innerHTML = '';
    uploadArea.classList.remove('hidden');
    previewArea.classList.add('hidden');
});

// 表单提交逻辑
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(uploadForm);
    
    // 按钮 Loading 态
    submitBtn.setAttribute('aria-busy', 'true');
    submitBtn.disabled = true;
    const originalContent = submitBtn.innerHTML;
    submitBtn.innerHTML = `
        <i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i>
        <span>正在保存记忆...</span>
    `;
    lucide.createIcons();

    try {
        // 1. 更新 entry 状态和内容
        const updateData = {
            id: parseInt(editId),
            title: formData.get('title'),
            content: formData.get('content'),
            date: formData.get('date'),
            type: 'milestone',
            status: 'completed'
        };

        await apiRequest('/entry', {
            method: 'POST',
            body: JSON.stringify(updateData)
        });

        // 2. 上传新照片
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

        // 成功反馈
        submitBtn.innerHTML = `
            <i data-lucide="check-circle-2" class="w-5 h-5"></i>
            <span>达成成功！</span>
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
