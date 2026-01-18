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
// 记录进入此页面的前一个路径 (用于保存后返回)
const previousPath = document.referrer;

let selectedFiles = []; // 存储新选择的文件

async function init() {
    if (!editId) {
        await showAlert('参数错误', '错误');
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
        showToast('加载数据失败: ' + err.message, 'error');
    }
}

// 渲染照片卡片
function renderPhotoCard(url, index = 0, fileObj = null) {
    const rotate = (index % 2 === 0 ? '-rotate-2' : 'rotate-2');
    const polaroid = document.createElement('div');
    polaroid.className = `polaroid-preview w-32 sm:w-40 ${rotate} transform transition-all relative group/photo cursor-pointer`;
    
    // 点击事件
    polaroid.onclick = () => handlePhotoClick(fileObj, polaroid);

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
async function handlePhotoClick(fileObj, element) {
    const confirmed = await showConfirm({
        title: '删除照片',
        message: '确定要移除这张照片吗？',
        type: 'danger'
    });
    
    if (!confirmed) return;

    if (fileObj) {
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
        if (selectedFiles.length === 0) {
            uploadArea.classList.remove('hidden');
            previewArea.classList.add('hidden');
        }
    }
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
        // previewContainer.innerHTML = ''; // 不要清空，支持追加
        files.forEach((file) => {
            selectedFiles.push(file);
            const reader = new FileReader();
            reader.onload = function(event) {
                renderPhotoCard(event.target.result, selectedFiles.length, file);
            }
            reader.readAsDataURL(file);
        });
        
        uploadArea.classList.add('hidden');
        previewArea.classList.remove('hidden');

        fileInput.value = ''; // 清空
    }
});

// 重新选择图片
reselectBtn.addEventListener('click', function() {
    selectedFiles = [];
    fileInput.value = ''; 
    previewContainer.innerHTML = '';
    uploadArea.classList.remove('hidden');
    previewArea.classList.add('hidden');
});

// 表单提交逻辑
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(uploadForm);
    
    // 修复时区问题：构造 ISO UTC 时间字符串覆盖 FormData
    const userDateVal = document.getElementById('date').value;
    if (userDateVal) {
        const d = new Date(userDateVal);
        formData.set('date', d.toISOString());
    }

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
        if (selectedFiles.length > 0) {
            const uploadFormData = new FormData();
            uploadFormData.append('entry_id', editId);
            // Array.from(fileInput.files).forEach(file => { // OLD
            selectedFiles.forEach(file => { // NEW
                uploadFormData.append('file', file, file.name);
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
            // 优先返回上一页，如果上一页存在且属于本站（非登录页）
            if (previousPath && previousPath.includes(window.location.host) && !previousPath.includes('login')) {
                window.location.href = previousPath;
            } else {
                window.location.href = 'milestones.html';
            }
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
