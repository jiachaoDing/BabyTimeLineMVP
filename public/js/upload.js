/**
 * upload.js - 美化版交互逻辑
 */

// DOM 元素引用
const uploadForm = document.getElementById('upload-form');
const fileInput = document.getElementById('file');
const uploadArea = document.getElementById('upload-area');
const previewArea = document.getElementById('preview-area');
const imagePreview = document.getElementById('image-preview');
const reselectBtn = document.getElementById('reselect-btn');
const submitBtn = document.getElementById('submit-btn');

// 1. 监听文件选择，生成拍立得预览
fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            // 设置图片源
            imagePreview.src = event.target.result;
            
            // 切换显示状态：隐藏上传框，显示预览卡片
            uploadArea.classList.add('hidden');
            previewArea.classList.remove('hidden');
            previewArea.classList.add('animate-fade-in'); // 假设 tailwind config 有 fade-in
        }
        reader.readAsDataURL(file);
    }
});

// 2. 重新选择图片
reselectBtn.addEventListener('click', function() {
    // 清空 input
    fileInput.value = ''; 
    
    // 切换显示状态：显示上传框，隐藏预览卡片
    uploadArea.classList.remove('hidden');
    previewArea.classList.add('hidden');
});

// 3. 表单提交逻辑
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(uploadForm);

    // 基础校验
    if (!formData.get('file') || fileInput.files.length === 0) {
        alert('请一定要选一张好看的照片哦！');
        return;
    }

    // 按钮 Loading 态
    submitBtn.setAttribute('aria-busy', 'true');
    submitBtn.disabled = true;
    const originalContent = submitBtn.innerHTML;
    submitBtn.innerHTML = `
        <i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i>
        <span>正在小心翼翼地保存...</span>
    `;
    lucide.createIcons();

    try {
        await apiRequest('/upload', {
            method: 'POST',
            body: formData
        });

        // 成功反馈
        submitBtn.innerHTML = `
            <i data-lucide="check-circle-2" class="w-5 h-5"></i>
            <span>保存成功！</span>
        `;
        submitBtn.classList.remove('bg-baby-pink-deep');
        submitBtn.classList.add('bg-green-500');
        lucide.createIcons();
        
        setTimeout(() => {
            window.location.href = 'timeline.html';
        }, 1000);

    } catch (err) {
        console.error('Upload failed:', err);
        alert('哎呀，发布失败了: ' + err.message);
        submitBtn.innerHTML = originalContent;
        lucide.createIcons();
    } finally {
        submitBtn.setAttribute('aria-busy', 'false');
        submitBtn.disabled = false;
    }
});