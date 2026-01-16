# BabyTimeLine 设计系统 (Design System)

这是一份专门为「宝宝成长记录」网站设计的 UI/UX 指南。本系统的核心理念是：**温暖、柔和、直觉、家庭感**。

---

## 🎨 1. 色彩体系 (Color Palette)
我们选择低饱和度的莫兰迪色系，避免强烈的视觉冲击，营造温馨、安静的氛围。

| 用途 | 颜色名称 | 十六进制 (HEX) | Tailwind 类名 | 视觉感官 |
| :--- | :--- | :--- | :--- | :--- |
| **背景层** | 暖米白 | `#FDFBF7` | `bg-[#FDFBF7]` | 温暖如纸张，不刺眼 |
| **主色 (女孩/柔和)** | 樱花粉 | `#FFF0F3` | `bg-[#FFF0F3]` | 娇嫩、软萌 |
| **辅助色 (男孩/自然)** | 薄荷绿 | `#F1F8E9` | `bg-[#F1F8E9]` | 清新、成长、自然 |
| **文字主色** | 深石板色 | `#334155` | `text-slate-700` | 稳重但不像纯黑那样生硬 |
| **文字次色** | 中灰蓝 | `#64748B` | `text-slate-500` | 用于时间戳、副标题 |
| **描边/分割线** | 浅米色 | `#E7E5E4` | `border-stone-200` | 细腻、低调 |

---

## 🔠 2. 字体规范 (Typography)
优先使用圆润、易读的无衬线字体。

- **字体家族**: 
  - iOS/Mac: `PingFang SC`, `System Font`
  - Android/Windows: `Noto Sans SC`, `Microsoft YaHei`
  - **建议 CSS**: `font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;`
- **层级设定**:
  - **大标题 (Page Title)**: `text-3xl font-bold tracking-tight text-slate-800`
  - **日期/卡片标题**: `text-xl font-semibold text-slate-700`
  - **正文内容**: `text-base leading-relaxed text-slate-600`
  - **辅助文本**: `text-sm text-slate-400`

---

## 📏 3. 留白与间距 (Spacing & Sizing)
强调“呼吸感”，避免界面拥挤。

- **页面边距 (Container)**: 
  - 移动端: `px-4` (16px)
  - 桌面端: `max-w-2xl mx-auto px-6` (针对阅读体验进行限制)
- **元素间距**:
  - 卡片之间: `mb-6` 或 `space-y-6`
  - 文字段落: `leading-relaxed`
- **圆角规范**:
  - 按钮/小标签: `rounded-full` (彻底圆润)
  - 卡片/图片: `rounded-2xl` 或 `rounded-3xl` (大圆角更有亲和力)

---

## 🖱️ 4. 按钮风格 (Buttons)
所有的交互元素都应该有明显的视觉反馈，但动作要轻盈。

- **主按钮 (Primary)**:
  - 样式: `bg-[#FF8FAB] text-white rounded-full px-6 py-3 font-medium shadow-sm active:scale-95 transition-all`
  - 状态: 悬停时颜色略微加深，点击时缩小 5%。
- **次要按钮 (Secondary)**:
  - 样式: `bg-white border-2 border-[#F1F8E9] text-slate-600 rounded-full px-6 py-3`
- **禁止 emoji 作为图标**: 请使用 SVG 图标（如 Lucide 或 Heroicons）。

---

## 🗂️ 5. 卡片风格 (Card Style)
卡片是内容的核心载体。

- **容器**: 
  - `bg-white/80 backdrop-blur-sm border border-stone-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-3xl p-5`
- **图片处理**:
  - `w-full aspect-square object-cover rounded-2xl mb-4`
- **交互**: 
  - `cursor-pointer hover:shadow-md transition-shadow`

---

## ⏳ 6. 时间线布局 (Timeline Layout)
针对“宝宝成长”这一核心逻辑，布局应兼顾阅读文字和欣赏照片。

### 6.1 时光轴节点 (Timeline Node)
- **容器**: `flex gap-4 pb-12 last:pb-0`
- **左侧轴线**: 
  - 容器: `flex flex-col items-center`
  - 圆点: `w-4 h-4 rounded-full bg-baby-pink-deep border-4 border-baby-pink shadow-sm`
  - 线条: `w-0.5 h-full bg-stone-200 rounded-full`
- **内容区**: `flex-1 pt-0`

### 6.2 照片墙视图 (Photo Wall / Grid)
当一天内有多张照片时，使用以下网格系统：
- **单张**: `aspect-square rounded-2xl`
- **两张**: `grid grid-cols-2 gap-2`
- **三张及以上**: `grid grid-cols-3 gap-2`
- **Hover 效果**: `hover:opacity-90 transition-opacity cursor-zoom-in`

---

## 🎨 8. 图标与视觉元素 (Icons & Visuals)
为了保持专业感和一致性，禁止使用系统 Emoji 作为 UI 图标。

- **推荐库**: [Lucide Icons](https://lucide.dev/) 或 [Heroicons](https://heroicons.com/)。
- **图标风格**: 线性 (Outline)，粗细为 `2px` 或 `1.5px`，线条末端圆润。
- **尺寸**: 
  - 标准按钮/列表项: `w-5 h-5` (20px)
  - 装饰性图标: `w-8 h-8` (32px)
- **品牌 Logo**: 建议使用宝宝的足迹或简洁的小爱心 SVG。

---

## ✨ 9. 交互与动画 (Interactions)
动画应像呼吸一样轻柔，避免突兀。

- **悬停状态 (Hover)**: 
  - 缩放: `hover:scale-[1.02]` (极其微小的放大)
  - 颜色渐变: `transition-colors duration-300`
- **过渡效果**: 
  - 页面进入: 简单的淡入 `animate-fade-in`
  - 列表展开: 使用 `transition-all` 配合 `max-height`
- **点击反馈**: 按钮点击时使用 `active:scale-95`。

---

## ♿ 10. 无障碍与易用性 (Accessibility)
针对家庭成员（包括可能的长辈）进行优化。

- **点击区域**: 所有可点击元素的最小尺寸不低于 `44x44px`。
- **对比度**: 即使是浅色系，正文字体也要保持在 `slate-700` 以上，确保易读。
- **反馈**: 上传成功或失败时，使用顶部的 Toast 提醒，而不是弹窗阻断操作。

---

## 📋 11. 设计原则 CheckList (Do & Don't)

| ✅ 建议 (Do) | ❌ 避免 (Don't) |
| :--- | :--- |
| 使用 `rounded-3xl` 或更大的圆角 | 使用尖锐的直角或 `rounded-sm` |
| 使用淡雅的背景色区分板块 | 使用生硬的实线分割线 |
| 图片统一保持 `aspect-square` | 图片长短不一导致布局混乱 |
| 保持一致的 `cursor-pointer` | 交互元素没有鼠标手势提示 |
| 重要的文字使用深色 | 使用浅灰色 `gray-300` 显示重要信息 |

---

## 🏗️ 13. 页面结构示例 (Full Layout Example)

```html
<!-- 背景层 -->
<div class="min-h-screen bg-baby-bg font-sans text-baby-slate">
  
  <!-- 导航栏 (浮动式) -->
  <nav class="sticky top-4 mx-4 bg-white/70 backdrop-blur-md border border-white/20 shadow-baby rounded-full px-6 py-3 flex justify-between items-center z-50">
    <span class="font-bold text-lg">👶 BabyTime</span>
    <div class="space-x-4 flex items-center">
      <a href="#" class="text-sm hover:text-baby-pink-deep transition-colors">时光轴</a>
      <button class="bg-baby-pink-deep text-white px-4 py-1.5 rounded-full text-sm font-medium shadow-sm hover:opacity-90 active:scale-95 transition-all">
        上传照片
      </button>
    </div>
  </nav>

  <!-- 大标题 -->
  <header class="py-16 px-4 text-center">
    <h1 class="text-4xl font-extrabold tracking-tight">宝宝的成长记录</h1>
    <p class="mt-4 text-slate-500 max-w-md mx-auto">每一个瞬间，都值得被温柔地留存。在这里，我们记录爱与成长。</p>
  </header>

  <!-- 时间线 -->
  <main class="max-w-xl mx-auto px-4">
    <!-- 时间线节点 -->
    <div class="flex gap-6 pb-12">
      <!-- 左侧装饰轴 -->
      <div class="flex flex-col items-center">
        <div class="w-4 h-4 rounded-full bg-baby-pink-deep ring-4 ring-baby-pink shadow-sm"></div>
        <div class="w-0.5 h-full bg-stone-200 mt-2 rounded-full"></div>
      </div>
      
      <!-- 内容卡片 -->
      <div class="flex-1">
        <div class="bg-white/80 backdrop-blur-sm border border-stone-100 shadow-baby rounded-3xl p-6 hover:shadow-md transition-shadow">
          <time class="text-sm font-bold text-baby-pink-deep/80 mb-2 block uppercase tracking-wider">2026年1月16日</time>
          <h3 class="text-xl font-bold text-slate-800 mb-3">第一次翻身！</h3>
          <p class="text-slate-600 leading-relaxed mb-6">
            今天早上 10 点，宝宝在爬行垫上突然用力一蹬，竟然自己翻过来了！全家人都在旁边欢呼，宝宝自己也笑得特别开心。
          </p>
          
          <!-- 照片墙 (Grid) -->
          <div class="grid grid-cols-2 gap-3">
            <div class="aspect-square bg-slate-100 rounded-2xl overflow-hidden shadow-inner group">
              <img src="photo1.jpg" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            </div>
            <div class="aspect-square bg-slate-100 rounded-2xl overflow-hidden shadow-inner group">
              <img src="photo2.jpg" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 更多节点... -->
  </main>

  <footer class="py-12 text-center text-slate-400 text-xs">
    <p>记录宝宝成长的每一个瞬间 ❤️ By Family</p>
  </footer>
</div>
```

---

## 💡 7. UX 最佳实践
- **反馈**: 上传照片时，使用带柔和动画的进度条。
- **空状态**: 当某天没有记录时，显示“今天宝宝有哪些可爱的瞬间呢？”的温馨引导语。
- **长辈友好**: 保持按钮足够大，文字对比度符合 WCAG AA 标准（虽然是浅色系，但文字一定要深）。

---

## 🛠️ Tailwind 配置示例 (tailwind.config.js)

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        'baby-bg': '#FDFBF7',
        'baby-pink': '#FFF0F3',
        'baby-pink-deep': '#FF8FAB',
        'baby-green': '#F1F8E9',
        'baby-text': '#334155',
      },
      borderRadius: {
        '4xl': '2rem',
      }
    }
  }
}
```
