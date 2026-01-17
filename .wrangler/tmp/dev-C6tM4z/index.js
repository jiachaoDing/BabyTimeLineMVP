var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker/src/routes/auth.ts
async function handleLogin(request, env) {
  try {
    const { password } = await request.json();
    if (!password) {
      return new Response(JSON.stringify({ error: "Password is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (password === env.FAMILY_PASSWORD) {
      return new Response(JSON.stringify({
        token: env.FAMILY_TOKEN,
        message: "Login successful"
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ error: "Invalid password" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(handleLogin, "handleLogin");

// worker/src/supabase.ts
async function supabaseFetch(env, endpoint, options = {}) {
  const url = `${env.SUPABASE_URL}/rest/v1${endpoint}`;
  const headers = {
    "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
    // 返回插入/更新后的数据
    ...options.headers
  };
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase error: ${response.status} ${error}`);
  }
  return response.json();
}
__name(supabaseFetch, "supabaseFetch");
async function selectEntries(env, options = {}) {
  let query = "/entries?select=*&order=date.desc";
  if (options.type && options.type !== "all") {
    query += `&type=eq.${options.type}`;
  }
  if (options.limit !== void 0) {
    const offset = options.offset || 0;
    query += `&limit=${options.limit}&offset=${offset}`;
  }
  return await supabaseFetch(env, query);
}
__name(selectEntries, "selectEntries");
async function selectAllMilestones(env) {
  return await supabaseFetch(env, "/entries?select=*&type=eq.milestone&order=date.desc");
}
__name(selectAllMilestones, "selectAllMilestones");
async function selectMediaByEntries(env, entryIds) {
  if (entryIds.length === 0) return [];
  const ids = entryIds.join(",");
  return await supabaseFetch(env, `/media?entry_id=in.(${ids})&select=*`);
}
__name(selectMediaByEntries, "selectMediaByEntries");
async function insertEntry(env, entry) {
  const result = await supabaseFetch(env, "/entries", {
    method: "POST",
    body: JSON.stringify({
      ...entry,
      type: entry.type || "daily",
      status: entry.status || "completed"
    })
  });
  return result[0];
}
__name(insertEntry, "insertEntry");
async function updateEntry(env, id, entry) {
  const result = await supabaseFetch(env, `/entries?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify(entry)
  });
  return result[0];
}
__name(updateEntry, "updateEntry");
async function insertMedia(env, media) {
  const result = await supabaseFetch(env, "/media", {
    method: "POST",
    body: JSON.stringify({
      ...media,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    })
  });
  return result[0];
}
__name(insertMedia, "insertMedia");
async function deleteEntry(env, id) {
  await supabaseFetch(env, `/entries?id=eq.${id}`, {
    method: "DELETE"
  });
}
__name(deleteEntry, "deleteEntry");
async function deleteMedia(env, id) {
  return await supabaseFetch(env, `/media?id=eq.${id}`, {
    method: "DELETE"
  });
}
__name(deleteMedia, "deleteMedia");
async function selectMediaById(env, id) {
  const result = await supabaseFetch(env, `/media?id=eq.${id}&select=*`);
  return result[0];
}
__name(selectMediaById, "selectMediaById");
async function deleteMediaByEntryId(env, entryId) {
  return await supabaseFetch(env, `/media?entry_id=eq.${entryId}`, {
    method: "DELETE"
  });
}
__name(deleteMediaByEntryId, "deleteMediaByEntryId");

// worker/src/r2.ts
function generateR2Key(filename) {
  const date = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const timestamp = Date.now();
  const randomHex = Math.random().toString(16).slice(2, 8);
  const extension = filename.split(".").pop() || "jpg";
  return `${date}/${timestamp}-${randomHex}.${extension}`;
}
__name(generateR2Key, "generateR2Key");
async function putObject(env, key, file, contentType) {
  await env.R2_BUCKET.put(key, file, {
    httpMetadata: { contentType }
  });
  return key;
}
__name(putObject, "putObject");
async function deleteObject(env, key) {
  await env.R2_BUCKET.delete(key);
}
__name(deleteObject, "deleteObject");

// worker/src/routes/timeline.ts
async function handleGetTimeline(request, env) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const type = url.searchParams.get("type") || "all";
  const search = url.searchParams.get("search") || "";
  const offset = (page - 1) * limit;
  const entries = await selectEntries(env, { limit, offset, type });
  let filteredEntries = entries;
  if (search) {
    filteredEntries = entries.filter(
      (e) => (e.title || "").toLowerCase().includes(search.toLowerCase()) || (e.content || "").toLowerCase().includes(search.toLowerCase())
    );
  }
  if (filteredEntries.length === 0) {
    return new Response(JSON.stringify([]), {
      headers: { "Content-Type": "application/json" }
    });
  }
  const entryIds = filteredEntries.map((e) => e.id);
  const allMedia = await selectMediaByEntries(env, entryIds);
  const result = filteredEntries.map((entry) => {
    const media = allMedia.filter((m) => m.entry_id === entry.id).map((m) => ({
      ...m,
      url: `/api/media/${m.r2_key}?token=${env.FAMILY_TOKEN}`
    }));
    return { ...entry, media };
  });
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(handleGetTimeline, "handleGetTimeline");
async function handleGetMilestones(request, env) {
  const milestones = await selectAllMilestones(env);
  return new Response(JSON.stringify(milestones), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(handleGetMilestones, "handleGetMilestones");
async function handleCreateEntry(request, env) {
  const body = await request.json();
  const { id, title, content, date, type, status } = body;
  if (!content || !date) {
    return new Response(JSON.stringify({ error: "Content and date are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  let result;
  try {
    if (id) {
      result = await updateEntry(env, id, { title, content, date, type, status });
    } else {
      result = await insertEntry(env, { title, content, date, type, status });
    }
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(handleCreateEntry, "handleCreateEntry");
async function handleDeleteEntry(request, env) {
  const url = new URL(request.url);
  const idStr = url.pathname.split("/").pop();
  const id = idStr ? parseInt(idStr) : null;
  if (!id) {
    return new Response(JSON.stringify({ error: "Entry ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const mediaList = await selectMediaByEntries(env, [id]);
    for (const media of mediaList) {
      if (media.r2_key) {
        await deleteObject(env, media.r2_key);
      }
    }
    await deleteMediaByEntryId(env, id);
    await deleteEntry(env, id);
    return new Response(JSON.stringify({ success: true, message: "Entry and associated media deleted" }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("Delete Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(handleDeleteEntry, "handleDeleteEntry");

// worker/src/routes/upload.ts
async function handleUpload(request, env) {
  const formData = await request.formData();
  const files = formData.getAll("file");
  let entryIdStr = formData.get("entry_id");
  const title = formData.get("title") || "";
  const content = formData.get("content") || "";
  const date = formData.get("date") || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const type = formData.get("type") || "daily";
  const status = formData.get("status") || "completed";
  let entryId;
  if (!entryIdStr) {
    if (!content && files.length === 0) {
      return new Response(JSON.stringify({ error: "Content or file is required for new entry" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const newEntry = await insertEntry(env, { title, content, date, type, status });
    entryId = newEntry.id;
  } else {
    entryId = parseInt(entryIdStr);
  }
  const uploadedMedia = [];
  for (const file of files) {
    if (file && file.size > 0) {
      if (!file.type.startsWith("image/")) {
        continue;
      }
      const r2Key = generateR2Key(file.name);
      await putObject(env, r2Key, await file.arrayBuffer(), file.type);
      const media = await insertMedia(env, {
        entry_id: entryId,
        r2_key: r2Key,
        file_type: file.type,
        taken_at: date
      });
      uploadedMedia.push({
        id: media.id,
        r2_key: r2Key,
        url: `/api/media/${r2Key}?token=${env.FAMILY_TOKEN}`
      });
    }
  }
  return new Response(JSON.stringify({
    entry_id: entryId,
    media: uploadedMedia,
    message: uploadedMedia.length > 0 ? `Uploaded ${uploadedMedia.length} files` : "Entry created without images"
  }), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(handleUpload, "handleUpload");

// worker/src/routes/media.ts
async function handleGetMedia(request, env) {
  const url = new URL(request.url);
  const key = url.pathname.replace("/api/media/", "");
  if (!key) {
    return new Response(JSON.stringify({ error: "Key required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const object = await env.R2_BUCKET.get(key);
    if (!object) {
      return new Response("Object Not Found", { status: 404 });
    }
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("Cache-Control", "private, max-age=3600");
    headers.set("Access-Control-Allow-Origin", "*");
    return new Response(object.body, {
      headers
    });
  } catch (err) {
    console.error("R2 Get Error:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(handleGetMedia, "handleGetMedia");
async function handleDeleteMedia(request, env) {
  const url = new URL(request.url);
  const idStr = url.pathname.split("/").pop();
  const id = idStr ? parseInt(idStr) : null;
  if (!id) {
    return new Response(JSON.stringify({ error: "Media ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const media = await selectMediaById(env, id);
    if (!media) {
      return new Response(JSON.stringify({ error: "Media not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (media.r2_key) {
      await deleteObject(env, media.r2_key);
    }
    await deleteMedia(env, id);
    return new Response(JSON.stringify({ success: true, message: "Media deleted" }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("Delete Media Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(handleDeleteMedia, "handleDeleteMedia");

// worker/src/index.ts
var src_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
      });
    }
    if (path === "/api/login" && request.method === "POST") {
      return handleLogin(request, env);
    }
    if (path.startsWith("/api/") && path !== "/api/login") {
      const authHeader = request.headers.get("Authorization");
      let token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
      if (!token) {
        token = url.searchParams.get("token");
      }
      if (!token || token !== env.FAMILY_TOKEN) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
    }
    let response;
    try {
      if (path.startsWith("/api/media/") && request.method === "GET") {
        response = await handleGetMedia(request, env);
      } else if (path.startsWith("/api/media/") && request.method === "DELETE") {
        response = await handleDeleteMedia(request, env);
      } else if (path === "/api/timeline" && request.method === "GET") {
        response = await handleGetTimeline(request, env);
      } else if (path === "/api/milestones" && request.method === "GET") {
        response = await handleGetMilestones(request, env);
      } else if (path === "/api/entry" && request.method === "POST") {
        response = await handleCreateEntry(request, env);
      } else if (path.startsWith("/api/entry/") && request.method === "DELETE") {
        response = await handleDeleteEntry(request, env);
      } else if (path === "/api/upload" && request.method === "POST") {
        response = await handleUpload(request, env);
      } else {
        response = new Response("Not Found", { status: 404 });
      }
    } catch (err) {
      console.error("API Error:", err);
      response = new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    const newHeaders = new Headers(response.headers);
    if (!newHeaders.has("Access-Control-Allow-Origin")) {
      newHeaders.set("Access-Control-Allow-Origin", "*");
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-qTYpF2/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-qTYpF2/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
