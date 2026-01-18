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
let selectedFiles = []; // 存储新选择的文件

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

// 里程碑切换
if (typeToggle && typeHidden) {
    typeToggle.addEventListener('change', (e) => {
        typeHidden.value = e.target.checked ? 'milestone' : 'daily';
    });
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
    // 乐观更新：先移除 UI，如果失败再加回来（或者显示 loading）
    // 这里为了简单，先显示 loading 状态
    
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
window.deleteExistingPhoto = deleteExistingPhoto; // 保持兼容

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
        // 清空上传区域（如果是第一次添加）
        if (!editId && existingMediaCount === 0 && selectedFiles.length === 0) {
             // 仅当之前没有任何内容时才可能需要清理，但其实 previewContainer 此时应该是空的
        }
        
        files.forEach((file) => {
            selectedFiles.push(file); // 添加到全局数组
            const reader = new FileReader();
            reader.onload = function(event) {
                // index 仅用于旋转样式，传 selectedFiles.length 即可
                renderPhotoCard(event.target.result, null, existingMediaCount + selectedFiles.length, file);
            }
            reader.readAsDataURL(file);
        });
        
        uploadArea.classList.add('hidden');
        previewArea.classList.remove('hidden');
        
        // 清空 input，允许重复选择同一文件
        fileInput.value = '';
    }
});

// 重新选择
reselectBtn.addEventListener('click', function() {
    selectedFiles = []; // 清空新文件数组
    fileInput.value = '';
    
    if (editId) {
        // 编辑模式：移除所有新添加的（没有 deleteExistingPhoto 的）
        // 实际上我们的 renderPhotoCard 结构变了，重新遍历清理 DOM
        const cards = Array.from(previewContainer.children);
        cards.forEach(card => {
             // 如果 onclick 绑定的函数包含 deleteExistingPhoto 或者我们在 DOM 上标记了
             // 最简单的：重新加载数据 或者 手动移除所有未绑定 mediaId 的
             // 由于我们没有存 DOM -> mediaId 的映射在 DOM 上，这里简单粗暴点：
             // 移除所有 DOM，重新渲染 existing
             // 或者：
             card.remove(); 
        });
        
        // 重新渲染旧数据 (需要 entry 数据，但这里没有缓存 entry)
        // 简单做法：刷新页面 或者 重新 fetch。
        // 为了体验，我们只移除“新添加”的。
        // 但我们怎么区分？
        // 我们可以给 existing 的 card 加个 class 'existing-photo'
        // 修改 renderPhotoCard 加 class
        // 由于不想改动太大，我们直接 reload 现有数据吧
        loadExistingData(); // 重新加载会清空 container 并渲染 existing
    } else {
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
    
    // 手动处理日期，将其转换为 ISO 字符串但不改变时间（即认为用户输入的就是 UTC 时间，或者直接作为字符串存储）
    // 为了后端 Supabase 兼容性，我们通常将其转换为 ISO 格式。
    // 这里我们构建一个保留用户输入当地时间的 Date 对象，并将其转换为 UTC 格式发送，
    // 或者直接发送带有时区信息的字符串（取决于后端处理）。
    // 最稳妥的方式：把用户输入的时间当作“当地时间”，然后算出对应的 UTC 时间发送给后端。
    // 但是，如果之前的逻辑是直接 new Date(dateStr).toISOString()，浏览器会将其视为当地时间并转换为 UTC。
    // 比如输入 00:30 (CN)，toISOString 会变成 前一天 16:30 (UTC)。
    // 此时后端存的是 16:30，前端再取出来展示时，如果是 new Date(utcString)，又会加 8 小时变回 00:30。
    // 问题在于：如果保存后显示变成了 08:30，说明存进去的时候可能没有减 8 小时（或者存的就是 00:30），但取出来的时候又加了 8 小时。
    
    // 假设后端是 UTC 存储。
    // 现在的现象：填 00:30 -> 显 08:30。说明存进去的时候可能已经是 00:30 (UTC)，显示的时候加了 8 小时。
    // 这意味着发送给后端的时候，没有正确转换为 UTC，或者转换逻辑有问题。
    // 让我们看看后端 upload 接口怎么处理 date。如果是直接取 FormData 的 date 字段。

    // 修复方案：明确告诉后端这个时间字符串。
    // 为了简单起见，我们自己构造一个 ISO 字符串，但修正时区偏移，确保“看起来”的时间和用户输入的一致。
    
    const userDateVal = document.getElementById('date').value; // "2025-12-18T00:30"
    let dateToSend = userDateVal;

    if (userDateVal) {
        const d = new Date(userDateVal);
        // 直接发送 ISO 字符串给后端，后端解析时通常会将其视为 UTC 或带时区的时间
        // 如果我们希望存入数据库的是 UTC 时间，且希望它对应用户的当地时间：
        dateToSend = d.toISOString(); 
    }
    
    // 如果之前的问题是 "存 00:30 -> 显 08:30"，这通常是因为：
    // 前端输入 00:30 -> 浏览器解析为当地时间 00:30 (UTC+8) -> toISOString() -> 16:30 (UTC, 前一天)
    // 后端存 16:30
    // 前端读 16:30 -> 浏览器解析 (UTC) -> +8h -> 显示 00:30。  
    // 这种情况下是正常的。
    
    // 如果用户说 "显示为 08:30"，那说明后端存的可能是 00:30 (UTC)。
    // 也就是说，前端发送的时候，可能发的就是 00:30。
    // 或者是：前端发了 16:30 (UTC)，但后端/数据库认为它是当地时间，没做转换直接存了？
    
    // 还有一种可能：用户所在的“时区”设置和预期不符。
    
    // 让我们尝试另一种策略：完全在前端控制。
    // 既然通过 FormData 获取的 date 是字符串 "2025-12-18T00:30"。
    // 我们手动将其转换为 UTC 时间字符串，使得其 UTC 时间值等于用户输入的值。
    // 比如用户输入 00:30，我们发给后端的 date 字符串让后端存为 00:30 (UTC)。
    // 这样前端展示时（通常只展示字符串或手动格式化），如果不做时区转换，就是 00:30。
    // 但标准做法是：存 UTC，展示时转当地。
    
    // 用户的现象是：输入 00:30 -> 变 08:30。
    // 这意味着：(存的值) + (展示时的时区偏移) = 08:30。
    // 如果展示时加了 8 小时，那说明存的值是 00:30。
    // 也就是存进数据库的是 00:30。
    // 如果前端用 new Date('...00:30').toISOString() 发送，发的是 16:30 (前一天)。
    // 那么 16:30 + 8h = 00:30。这是对的。
    
    // 那为什么会变成 08:30 呢？
    // 唯一可能是：存进去的是 00:30，取出来加了 8 小时。
    // 也就是说，发送给后端时，直接发了 "2025-12-18T00:30" 这个字符串，而后端直接把它当 UTC 存了。
    
    // 修正：我们要确保发送的是正确的 UTC 时间 (即减去 8 小时)。
    // new Date(userDateVal).toISOString() 就是正确的 UTC 时间。
    
    // 等等，如果用户是在代码里看到 "显示为"，是指页面上渲染出来的文字？
    // 页面渲染代码 components.js: formatDate
    // function formatDate(dateStr) { const d = new Date(dateStr); ... return ... }
    // 如果 dateStr 是 "2025-12-18T00:30:00Z" (UTC)，
    // new Date(dateStr) 会在浏览器里变成 08:30 (CN)。
    
    // 所以，如果用户输入 00:30，希望显示 00:30。
    // 意味着数据库里存的应该是 16:30 (UTC)。
    // 那么前端发送时，应该发送 16:30。
    // new Date("2025-12-18T00:30").toISOString() === "2025-12-17T16:30:00.000Z" (在 UTC+8 环境下)。
    // 如果发送这个给后端，后端存下来，前端再取回来 "2025-12-17T16:30:00+00:00"。
    // 前端 new Date(...) -> 00:30。这应该是对的。
    
    // 那么用户为什么会遇到“显示为 08:30”？
    // 可能是因为后端没有把上传的 FormData 中的 date 字符串转换，而是直接存了字符串 "2025-12-18T00:30"。
    // 数据库里存了 "2025-12-18 00:30:00"。 Supabase (Postgres) 如果字段是 timestamp with time zone (timestamptz)，且没给时区，它会默认当做 UTC 吗？
    // 或者，后端代码里怎么处理的？
    
    // 无论如何，最稳妥的修复（针对用户描述的现象）：
    // 用户输入 00:30，变成了 08:30（多了8小时）。
    // 说明我们发送的时间“太晚了”或者解析时“加了两次”。
    // 我们手动构造一个 Date 对象，明确减去时区偏移，确保发给后端的是 ISO 格式。
    
    // 方案：
    // 1. 获取用户输入的 datetime-local 值（例如 "2025-12-18T00:30"）。
    // 2. 构造一个 Date 对象。
    // 3. 转换为 ISO 字符串。
    // 4. 将其更新到 FormData 中。

    if (userDateVal) {
       // 确保使用 ISO 格式发送，包含时区信息（Z）
       // 在浏览器环境中，new Date(localString) 会解析为本地时间
       // toISOString() 会转换为 UTC。
       // 比如 local 00:30 -> utc 16:30 (前一天)。
       // 如果后端存了 16:30，读出来 +8 -> 00:30。正确。
       
       // 但如果用户现在的现象是 00:30 -> 08:30。
       // 说明存进去的是 00:30 (UTC)。
       // 也就是发送的是 00:30。
       // 也就是说 FormData 默认发送的值可能没有被转为 UTC，而是直接发了 "2025-12-18T00:30"。
       // 并且后端直接拿这个字符串存入了 timestamptz 字段，Postgres 默认将其视为 UTC (如果没有带时区偏移)。
       
       // 所以我们需要显式地将其转为 ISO UTC 字符串，覆盖 FormData 中的默认值。
       const d = new Date(userDateVal);
       formData.set('date', d.toISOString());
    }

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
        // const rawFiles = Array.from(fileInput.files); // OLD
        const rawFiles = selectedFiles; // NEW: 使用 selectedFiles
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
        showToast('保存失败: ' + err.message, 'error');
        submitBtn.innerHTML = originalContent;
        lucide.createIcons();
    } finally {
        submitBtn.setAttribute('aria-busy', 'false');
        submitBtn.disabled = false;
    }
});
