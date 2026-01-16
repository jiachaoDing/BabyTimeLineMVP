# Baby Timeline — A Minimal Family-Private Growth Journal

**一个为家庭打造的真正私密的宝宝成长记录网站（MVP）**

Baby Timeline 是一个极简、隐私优先的宝宝成长记录系统，用于记录照片、日记、时间线，帮助父母和亲友一起见证孩子的成长瞬间。

它是为**真实家庭场景**而设计的，不是社交网站，不是 App，不需要注册，不需要下载。
只需要一个密码，就能进入属于你宝宝的小世界。

------

## ✨ 特点 Highlights

### 🍼 1. 每个宝宝自己的独立空间

- 单独访问入口
- 不公开、不社交
- 专属于宝宝的“成长小宇宙”

### 🔒 2. 隐私优先的访问模式

- 家庭私有密码
- 无注册、无需手机号
- 无外部第三方登录
- 完全静态部署 + Workers API

### 📸 3. 上传照片、写一句日记

- 上传宝宝的每日瞬间
- 填写一句文字记录当天心情
- 按日期自动排序显示在时间线中

### 🤖 4. AI 自动日记（可选）

- AI 自动生成 20–50 字的一句话日记
- 温柔、轻巧、适合宝宝成长记录
- 父母可以编辑后再保存
- 完全可控，不强制依赖 AI

### 📅 5. 时间线展示

- 以时间为主轴的记录方式
- 不用分类、不用整理
- 自动按照日期展示

------

## 🛠 技术栈 / Tech Stack

整个项目遵循 **极简架构原则**，不使用复杂框架，不依赖大型构建系统。

### **前端**

- 原生 HTML
- 原生 JavaScript（ES Modules）
- Tailwind CSS v4（CLI 编译版）
- 静态部署于 Cloudflare Pages

### **后端**

- Cloudflare Workers（TypeScript）
- Cloudflare D1（SQLite）存储照片记录
- Cloudflare R2（云端对象存储，MVP 使用占位逻辑）
- 简单 Token 鉴权（基于访问密码）

### **AI**

- 可选择 OpenAI / Cloudflare AI / 其他模型
- 生成一句温柔的成长日记文本

------

## 📁 项目结构 Project Structure

```
baby-timeline/
├─ public/
│  ├─ index.html
│  ├─ timeline.html
│  ├─ upload.html
│  ├─ assets/
│  │  └─ styles.css
│  └─ js/
│     ├─ api.js
│     ├─ auth.js
│     ├─ timeline.js
│     └─ upload.js
│
├─ src/
│  └─ input.css
│
├─ worker/
│  ├─ src/
│  │  ├─ index.ts
│  │  ├─ types.ts
│  │  ├─ routes/
│  │  │  ├─ auth.ts
│  │  │  ├─ timeline.ts
│  │  │  ├─ upload.ts
│  │  │  └─ ai.ts
│  │  ├─ db/
│  │  │  ├─ schema.sql
│  │  │  └─ photos.ts
│  │  └─ ai/diary.ts
│  ├─ package.json
│  └─ tsconfig.json
│
├─ package.json
└─ README.md
```

------

## 🚀 功能流程（MVP）

### ✔ 登录

1. 家长输入访问密码
2. 后端验证
3. 返回 token（存 localStorage）

------

### ✔ 上传照片记录

1. 选择照片（MVP 仅记录 fileName）
2. 输入日期
3. 可点击 AI 自动生成一句日记
4. 用户可编辑日记内容
5. 保存后跳转时间线

------

### ✔ 时间线展示

- 加载 `photos` 数据
- 按日期倒序排序
- 渲染卡片（日期 + 占位图片 + 日记）
- 后续可扩展真实图片 URL、瀑布流、相册等

------

## 🔮 未来计划（非 MVP）

以下功能将在 MVP 验证通过后考虑：

- 支持多宝宝 / 多家庭空间
- 自定义域名（如：**babyname.me**）
- 自动生成 AI 年度成长视频
- 真正的 R2 文件上传流程
- 照片墙模式（grid / masonry）
- 视频记录支持
- 家人留言/祝福
- 家庭账号体系（父母、爷爷奶奶、朋友）

------

## 🧩 为什么这样设计？

因为这是一个：

- **为家人使用而生**
- **情感价值比技术更重要**
- **极简但温暖**
- **隐私优先**

的项目。

所以：

### 我们刻意保持简单：

| 不做（现在）          | 原因               |
| --------------------- | ------------------ |
| 多用户登录            | 增加复杂度、不必要 |
| 社交分享/公开         | 有隐私风险         |
| 强制 AI               | 不需要强依赖       |
| 批量上传/压缩         | MVP 不需要         |
| 大型框架（Vue/React） | 过度工程           |

------

## 🧪 本地开发方式

```sh
npm install
npm run dev   # 监听 Tailwind CLI
```

另外：

```sh
cd worker
npx wrangler dev
```

然后访问：

```
http://localhost:8787
```

------

## 🌐 部署方式

1. 将 `/public` 上传到 Cloudflare Pages
2. 将 Worker 部署为 API 并绑定到同一域名
3. 配置 D1 数据库迁移
4. 配置 R2（若需要）
5. 设置访问密码和 AI_KEY 环境变量

即可上线一个完整的宝宝成长记录网站。

------

## ❤️ 为什么做这个项目？

因为：

- 每一个宝宝都值得一个独立的成长空间
- 每一个瞬间都值得被安全保存
- 每一个家庭都值得隐私和掌控权
- 每一张照片背后都有不可替代的故事
- 市面上缺乏**不社交、不商业、不打扰**的成长记录工具

Baby Timeline 不是为了互联网，而是为了家人。

------

## 📬 联系与反馈

如果你：

- 想扩展更多功能
- 想为自己的宝宝搭建一个版本
- 想参与后续方向设计

欢迎随时提出建议。

