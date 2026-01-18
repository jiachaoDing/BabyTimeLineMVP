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
- **R2 代理模式**：照片通过后端代理访问，不暴露真实存储地址，确保绝对安全。

### 📸 3. 丰富的记录方式

- **每日瞬间**：上传照片，写一句日记，按日期自动排序。
- **成长勋章**：预设或自定义里程碑（如“第一次叫妈妈”），点亮宝宝的每一个成就。
- **成长计划**：为宝宝设定未来的期待，记录待达成的美好愿景。

### 🎨 4. 多样的展示视图

- **时间线**：以时间为主轴，自动串联起宝宝的每一天。
- **星河画廊**：3D 视差效果的照片墙，沉浸式回顾美好回忆。
- **拍立得导出**：将精彩瞬间生成精美的拍立得风格卡片，支持编辑和下载分享。

### 🤖 5. AI 辅助（可选）

- AI 自动生成 20–50 字的一句话日记
- 温柔、轻巧、适合宝宝成长记录
- 父母可以编辑后再保存

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
- Cloudflare D1（SQLite）存储元数据（日记、里程碑状态）
- Cloudflare R2（云端对象存储）存储照片
- **安全代理层**：Worker 作为中间件验证 Token 并流式传输 R2 文件

### **AI**

- 可选择 OpenAI / Cloudflare AI / 其他模型
- 生成一句温柔的成长日记文本

------

## 📁 项目结构 Project Structure

```
baby-timeline/
├─ public/
│  ├─ index.html        # 首页
│  ├─ login.html        # 登录页
│  ├─ timeline.html     # 时间线主页
│  ├─ record.html       # 记录瞬间（上传页）
│  ├─ milestones.html   # 成长勋章馆
│  ├─ plan.html         # 设置期待（新建里程碑）
│  ├─ photos.html       # 星河画廊（照片墙）
│  ├─ polaroid.html     # 拍立得导出页
│  ├─ detail.html       # 日记详情页
│  ├─ complete.html     # 达成勋章页
│  ├─ assets/
│  │  └─ style.css      # 编译后的 Tailwind 样式
│  └─ js/
│     ├─ api.js         # API 请求封装
│     ├─ auth.js        # 鉴权逻辑
│     ├─ timeline.js    # 时间线逻辑
│     ├─ milestones.js  # 里程碑逻辑
│     ├─ photos.js      # 画廊逻辑
│     ├─ polaroid.js    # 拍立得生成逻辑
│     └─ ...
│
├─ src/
│  └─ input.css         # Tailwind 输入文件
│
├─ worker/
│  ├─ src/
│  │  ├─ index.ts       # 路由入口
│  │  ├─ routes/        # 业务路由 (auth, timeline, media, upload)
│  │  ├─ db/            # 数据库操作
│  │  └─ r2.ts          # R2 存储封装
│  └─ wrangler.toml     # Worker 配置
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

### ✔ 记录成长
1. **日常记录**：上传照片 -> AI 生成/手写日记 -> 保存至时间线。
2. **设定期待**：创建“待达成”的里程碑（如：第一次走路），设定预期时间。
3. **点亮勋章**：当宝宝完成里程碑时，上传照片点亮勋章，记录实际达成时间。

### ✔ 回顾与分享
- **时间线**：倒序查看所有日记和里程碑。
- **画廊模式**：沉浸式浏览所有照片。
- **拍立得**：选择一张照片，生成精美卡片，保存到本地或分享给亲友。

------

## 🔮 未来计划

以下功能将在后续版本考虑：

- 支持多宝宝 / 多家庭空间
- 自定义域名（如：**babyname.me**）
- 自动生成 AI 年度成长视频
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

Baby Timeline 不是为了互联网，而是为了家人。

------

## 🧪 本地开发方式

```sh
npm install
npm run dev   # 监听 Tailwind CLI
```

另外：

```sh
npx wrangler dev
```

然后访问：

```
http://localhost:8787
```

------

## 🌐 部署方式

得益于 Cloudflare Workers 的静态资源托管（Assets）功能，你只需要部署 Worker 即可。

1. **准备资源**：
   - 在 Supabase 创建数据库（参考 `worker/src/db/schema.sql` 建表）。
   - 在 Cloudflare 创建 R2 存储桶 `baby-timeline-media`。

2. **配置密钥**：
   ```sh
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   npx wrangler secret put FAMILY_TOKEN
   ```

3. **一键部署**：
   ```sh
   npx wrangler deploy
   ```

Worker 会自动处理 API 请求并托管 `/public` 目录下的所有静态文件，无需单独部署 Pages。

------

## 📬 联系与反馈

如果你：

- 想扩展更多功能
- 想为自己的宝宝搭建一个版本
- 想参与后续方向设计

欢迎随时提出建议。
