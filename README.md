# Baby Timeline — MVP Project Overview (R2 Proxy Version)

------

## 🎯 1. MVP Features (Strictly Minimalist)

Designed solely for internal family use with minimal functionality:

### ✔ Must Have:

- **Single Family Password**: Token stored in frontend localStorage.
- **Secure Access**: All photos are accessed via a Worker proxy; real R2 paths are never exposed.
- **Photo Upload**: Support for real Cloudflare R2 uploads.
- **Daily Journal**: One text entry per day.
- **Timeline View**: Display entries sorted by date.
- **Photo Wall**: A simple gallery view.

### ❌ Won't Do (For Now):

- Multi-user registration/login.
- Video uploads.
- Thumbnail generation.
- Multi-family support.
- Comments/Likes.
- Batch photo uploads.

**Goal: Ready for genuine family use within one week.**

------

## 🧩 2. Architecture (Supabase + Cloudflare R2 Proxy Mode)

```
Frontend (Static: Cloudflare Pages)
        |
        v
Cloudflare Worker (API/BFF & Proxy)
        |
        +--> Supabase Postgres (Stores metadata: entries / media)
        |
        +--> Cloudflare R2 (Private storage, no public access)
```

**Security Policy:**
- The frontend **never directly accesses** Supabase or R2.
- Media files are proxied through the `/api/media/*` route.
- **Authentication**:
  - API requests use the `Authorization` Header.
  - Image requests use a URL parameter `?token=...`.

------

## 🟦 3. Database Structure (Supabase Postgres)

### 1. `entries` — Daily Journal

```sql
create table entries (
  id          bigint generated always as identity primary key,
  date        date not null,
  title       text,
  content     text,
  created_at  timestamptz default now()
);
```

### 2. `media` — Photo Metadata

```sql
create table media (
  id          bigint generated always as identity primary key,
  entry_id    bigint references entries(id) on delete set null,
  r2_key      text not null,     -- Actual path in R2
  file_type   text not null,     -- e.g., 'image'
  taken_at    timestamptz,
  created_at  timestamptz default now()
);
```

------

## ☁️ 4. Cloudflare R2 Storage Structure

**Object Key Example:**
`2026-01-16/1737012345-abcd12.jpg`

**Naming Rule:**
`{YYYY-MM-DD}/{timestamp}-{random}.{ext}`

------

## 🚦 5. API Endpoints (Worker)

All API paths are accessed via `/api/...`.

### 1. Login
`POST /api/login`
- Body: `{ "password": "..." }`
- Response: `{ "token": "FAMILY_TOKEN" }`

### 2. Get Timeline
`GET /api/timeline`
- Response:
```json
[
  {
    "id": 123,
    "date": "2026-01-16",
    "title": "Baby's Day",
    "content": "Baby was very happy today.",
    "media": [
      { "id": 1, "url": "/api/media/key.jpg?token=xxxx" }
    ]
  }
]
```

### 3. Media Proxy (Core Security)
`GET /api/media/:key?token=xxxx`
- The Worker validates the token, then streams data from the private R2 bucket.
- Sets `Cache-Control: private` to balance privacy and performance.

### 4. Upload Photos & Entries
`POST /api/upload` (Multipart/form-data)
- Supports creating an entry and uploading an image simultaneously.
- Parameters: `file` (the image), `entry_id` (optional), `title` (optional), `content` (optional), `date` (optional).

### 5. Create or Update Entry (Text Only)
`POST /api/entry`
- Body: `{ "id": 123, "title": "...", "content": "...", "date": "..." }`
- If `id` is present, it updates; otherwise, it creates a new entry.

### 6. Delete Entry
`DELETE /api/entry/:id`
- Deletes the entry, its associated physical files in R2, and database media records.

------

## 📁 6. Project Structure

```
BabyTimeLineMVP/
├─ public/              # Frontend Static Files (Cloudflare Pages)
│  ├─ js/
│  │  ├─ api.js         # API Request Wrapper (Headers & Validation)
│  │  ├─ auth.js        # Login & Token Management
│  │  ├─ timeline.js    # Timeline Rendering
│  │  ├─ plan.js        # "Expectations" Logic
│  │  ├─ complete.js    # "Achievements" Logic
│  │  └─ record.js      # Record Moments/History Logic
│  ├─ index.html
│  ├─ login.html
│  ├─ timeline.html
│  ├─ milestones.html
│  ├─ plan.html
│  ├─ complete.html
│  └─ record.html
│
├─ worker/              # Backend Code (Cloudflare Worker)
│  ├─ src/
│  │  ├─ index.ts       # Routing Entry & Global Auth
│  │  ├─ r2.ts          # R2 Operation Wrapper
│  │  ├─ supabase.ts    # Supabase REST Wrapper
│  │  └─ routes/
│  │     ├─ auth.ts
│  │     ├─ timeline.ts
│  │     ├─ upload.ts
│  │     └─ media.ts     # Media Proxy Route
│  ├─ wrangler.toml     # Basic Config (No Secrets)
│  ├─ tsconfig.json     # Worker Type Config
│  └─ package.json
```

------

## 🧠 7. Core Design Decisions

### ✔ Why R2 Proxy Mode?
- **Maximum Security**: Photos are not exposed to the public internet; prevents leakage.
- **No Custom Domain**: No need to configure a custom domain for the R2 bucket.
- **Simple Auth**: Unified validation using `FAMILY_TOKEN`.

### ✔ Why Cloudflare Secrets?
- All sensitive keys (`SUPABASE_SERVICE_ROLE_KEY`, `FAMILY_TOKEN`) are stored via `wrangler secret put` and are never exposed in the source code.

------

## 📌 8. Development Status

1. [x] **Infrastructure Initialization**: Folder structure and skeleton code.
2. [x] **Backend Implementation**: Supabase REST wrapper, R2 proxy, global auth logic.
3. [x] **Security Hardening**: Token mechanism, proxy mode, secrets management.
4. [ ] **Database Setup**: Execute SQL in Supabase.
5. [ ] **Frontend Integration**: Replace skeleton logic with real UI operations.
6. [ ] **Deployment**: `npx wrangler deploy`.

------

## 🧪 9. Local Development

To run the project locally:

1. **Install Dependencies:**
   ```sh
   npm install
   ```

2. **Run Worker:**
   Navigate to the worker directory and run the development server:
   ```sh
   cd worker
   npm run dev
   # Or directly via wrangler
   npx wrangler dev
   ```

3. **Access the App:**
   Visit `http://localhost:8787` in your browser.

------

## 🌐 10. Deployment

Thanks to Cloudflare Workers' static asset hosting, you only need to deploy the Worker.

1. **Prepare Resources:**
   - Create the database in Supabase (use the SQL schema provided in Section 3).
   - Create an R2 bucket named `baby-timeline-media` in Cloudflare.

2. **Configure Secrets:**
   ```sh
   cd worker
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   npx wrangler secret put FAMILY_TOKEN
   ```

3. **Deploy:**
   ```sh
   npx wrangler deploy
   ```

The Worker will automatically handle API requests and host all static files from the `/public` directory.
