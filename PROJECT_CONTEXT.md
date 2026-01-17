# 《Baby Timeline — 最小可行版本（MVP）项目说明（R2 代理版更新）》

------

## 🎯 一、MVP 功能（仍然保持极简！）

只做家庭内部使用的最小功能：

### ✔ 必须有：

- 一个家庭密码（前端 localStorage 存 token）
- **安全访问**：所有照片通过 Worker 代理访问，不暴露 R2 真实路径
- 上传照片（支持真实 R2 上传）
- 每天写一段日记（文字）
- 按日期显示“时间线”
- 简单的“照片墙视图”

### ❌ 暂不实现：

- 多用户注册/登录
- 视频上传
- 缩略图生成
- 多家庭
- 评论/点赞
- 多照片批量上传

**目标：一周内就能让家人真正使用。**

------

## 🧩 二、最新架构图（Supabase + Cloudflare R2 代理模式）

```
前端（静态：Cloudflare Pages）
        |
        v
Cloudflare Worker (API/BFF & Proxy)
        |
        +--> Supabase Postgres（存元数据：entries / media）
        |
        +--> Cloudflare R2（私有存储，不开放公网访问）
```

**访问安全策略**：
- 前端**完全不直接访问** Supabase 或 R2。
- 媒体文件通过 `/api/media/*` 路由代理。
- 权限校验：API 请求使用 `Authorization` Header；图片请求使用 URL 参数 `?token=...`。

------

## 🟦 三、数据库（Supabase Postgres）结构

### 1. entries — 每天的日记

```sql
create table entries (
  id          bigint generated always as identity primary key,
  date        date not null,
  title       text,
  content     text,
  created_at  timestamptz default now()
);
```

### 2. media — 照片元数据表

```sql
create table media (
  id          bigint generated always as identity primary key,
  entry_id    bigint references entries(id) on delete set null,
  r2_key      text not null,     -- 在 R2 的真实路径
  file_type   text not null,     -- image
  taken_at    timestamptz,
  created_at  timestamptz default now()
);
```

------

## ☁️ 四、Cloudflare R2 存储结构

文件实际存储路径（object key）示例：
`2026-01-16/1737012345-abcd12.jpg`

规则：`{YYYY-MM-DD}/{timestamp}-{random}.{ext}`

------

## 🚦 五、API 端（Worker）说明

所有 API 路径统一以 `/api/...` 访问。

### 1. 登录
`POST /api/login`
- 请求体：`{ "password": "..." }`
- 返回：`{ "token": "FAMILY_TOKEN" }`

### 2. 获取时间线
`GET /api/timeline`
- 返回：
```json
[
  {
    "id": 123,
    "date": "2026-01-16",
    "title": "宝宝的一天",
    "content": "今天宝宝很开心。",
    "media": [
      { "id": 1, "url": "/api/media/key.jpg?token=xxxx" }
    ]
  }
]
```

### 3. 媒体代理（核心安全）
`GET /api/media/:key?token=xxxx`
- Worker 校验 token 后，从私有 R2 读取数据流式返回。
- 开启 `Cache-Control: private` 保证私密性与性能平衡。

### 4. 上传照片与动态
`POST /api/upload` (Multipart/form-data)
- 支持同时创建 entry 和上传图片。
- 参数：`file` (文件), `entry_id` (可选), `title` (可选), `content` (可选), `date` (可选)。

### 5. 创建或更新条目（纯文字）
`POST /api/entry`
- 请求体：`{ "id": 123, "title": "...", "content": "...", "date": "..." }` (有 id 为更新，无 id 为新建)

### 6. 删除条目
`DELETE /api/entry/:id`
- 删除条目及其关联的所有 R2 物理文件和数据库媒体记录。

------

## 📁 六、项目结构

```
BabyTimeLineMVP/
├─ public/              # 前端静态文件 (Cloudflare Pages)
│  ├─ js/
│  │  ├─ api.js         # API 请求封装 (带 Header 校验)
│  │  ├─ auth.js        # 登录与 Token 管理
│  │  ├─ timeline.js    # 时间线渲染
│  │  ├─ plan.js        # 设置期待逻辑
│  │  ├─ complete.js    # 达成勋章逻辑
│  │  └─ record.js      # 记录瞬间/历史逻辑
│  ├─ index.html
│  ├─ login.html
│  ├─ timeline.html
│  ├─ milestones.html
│  ├─ plan.html
│  ├─ complete.html
│  └─ record.html
│
├─ worker/              # 后端代码 (Cloudflare Worker)
│  ├─ src/
│  │  ├─ index.ts       # 路由入口与全局鉴权
│  │  ├─ r2.ts          # R2 操作封装
│  │  ├─ supabase.ts    # Supabase REST 封装
│  │  └─ routes/
│  │     ├─ auth.ts
│  │     ├─ timeline.ts
│  │     ├─ upload.ts
│  │     └─ media.ts     # 媒体代理路由
│  ├─ wrangler.toml     # 基础配置 (不含敏感信息)
│  ├─ tsconfig.json     # Worker 类型配置
│  └─ package.json
```

------

## 🧠 七、核心设计决策

### ✔ 为什么使用 R2 代理模式？
- **最高安全性**：照片不对公网开放，防止泄露。
- **无需域名**：不需要为 R2 存储桶配置自定义域名。
- **简单鉴权**：统一使用 `FAMILY_TOKEN` 校验。

### ✔ 为什么使用 Cloudflare Secrets？
- 所有的敏感 Key（`SUPABASE_SERVICE_ROLE_KEY`, `FAMILY_TOKEN`）均通过 `wrangler secret put` 存储，不在源码中暴露。

------

## 📌 九、开发状态

1. [x] **基础设施初始化**：文件夹结构与 Skeleton 代码。
2. [x] **后端实现**：Supabase REST 封装、R2 代理、全局鉴权逻辑。
3. [x] **安全性强化**：Token 机制、代理模式、Secrets 方案。
4. [ ] **数据库建表**：在 Supabase 执行 SQL。
5. [ ] **前端联调**：将 Skeleton 逻辑替换为真实的 UI 操作。
6. [ ] **部署测试**：npx wrangler deploy。
