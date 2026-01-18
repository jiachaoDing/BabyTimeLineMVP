import { Env } from './index';

/**
 * Supabase REST API 请求封装
 */
async function supabaseFetch<T = any>(env: Env, endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${env.SUPABASE_URL}/rest/v1${endpoint}`;
  const headers = {
    'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation', // 返回插入/更新后的数据
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase error: ${response.status} ${error}`);
  }
  return response.json() as Promise<T>;
}

/**
 * 查询日记条目 (带分页)
 */
export async function selectEntries(env: Env, options: { limit?: number; offset?: number; type?: string; sort?: 'asc' | 'desc'; excludeType?: string; search?: string; excludePendingMilestones?: boolean } = {}): Promise<any[]> {
  const sort = options.sort || 'desc';
  let query = `/entries?select=*&order=date.${sort}`;
  
  if (options.type && options.type !== 'all') {
    query += `&type=eq.${options.type}`;
  }
  
  if (options.excludeType) {
    query += `&type=neq.${options.excludeType}`;
  }

  if (options.excludePendingMilestones) {
    // 逻辑：保留 (type != milestone) OR (status != pending)
    // PostgREST 语法: or=(condition1,condition2)
    query += `&or=(type.neq.milestone,status.neq.pending)`;
  }

  if (options.search) {
    // PostgREST 语法: or=(title.ilike.*val*,content.ilike.*val*)
    // 注意：这里的 * 是通配符，不需要再加 %
    const searchPattern = `*${options.search}*`;
    query += `&or=(title.ilike.${searchPattern},content.ilike.${searchPattern})`;
  }
  
  if (options.limit !== undefined) {
    const offset = options.offset || 0;
    // Supabase 使用 Range header 或 limit/offset params
    // 这里使用 query params 比较直观
    query += `&limit=${options.limit}&offset=${offset}`;
  }
  
  return await supabaseFetch<any[]>(env, query);
}

/**
 * 查询所有勋章 (不分页，用于勋章墙)
 */
export async function selectAllMilestones(env: Env): Promise<any[]> {
  return await supabaseFetch<any[]>(env, '/entries?select=*&type=eq.milestone&order=date.desc');
}

/**
 * 根据条目 ID 查询媒体文件
 */
export async function selectMediaByEntries(env: Env, entryIds: number[]): Promise<any[]> {
  if (entryIds.length === 0) return [];
  const ids = entryIds.join(',');
  return await supabaseFetch<any[]>(env, `/media?entry_id=in.(${ids})&select=*`);
}

/**
 * 插入新条目
 */
export async function insertEntry(env: Env, entry: { title?: string; content: string; date: string; type?: string; status?: string }) {
  const result = await supabaseFetch(env, '/entries', {
    method: 'POST',
    body: JSON.stringify({
      ...entry,
      type: entry.type || 'daily',
      status: entry.status || 'completed'
    }),
  });
  return (result as any[])[0];
}

/**
 * 更新条目
 */
export async function updateEntry(env: Env, id: number, entry: { title?: string; content?: string; date?: string; type?: string; status?: string }) {
  // 手动更新 created_at 以触发 last_updated 变更 (因为我们目前只检查 created_at)
  // 或者更好的方式：数据库 entries 表应该有 updated_at 字段，并且 selectLatestUpdate 应该检查 updated_at
  // 这里采用折中方案：更新 created_at (虽然语义稍微不准，但能解决缓存不刷新的问题)
  // 但更推荐：修改 selectLatestUpdate 逻辑检查 updated_at (前提是表里有这个字段)
  
  // 假设 schema.sql 中 entries 表并没有 updated_at 字段 (基于之前的 read_file 结果推测)
  // 我们尝试更新 content 的同时，如果数据库支持自动 update updated_at 最好
  // 这里我们强制更新一下 created_at 为当前时间，虽然这会改变排序，但能强制刷新缓存。
  // 等等，改变 created_at 会导致时间线乱序（如果排序基于 created_at）。
  // 我们的排序是基于 `date` 字段的 (`order=date.desc`)，所以修改 created_at 不会影响时间线顺序。
  // 它可以作为 "最后修改时间" 来使用。
  
  const result = await supabaseFetch(env, `/entries?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      ...entry,
      created_at: new Date().toISOString() // Hack: 更新创建时间以触发同步
    }),
  });
  return (result as any[])[0];
}

/**
 * 插入媒体元数据
 */
export async function insertMedia(env: Env, media: { entry_id: number; r2_key: string; file_type: string; taken_at?: string }): Promise<any> {
  const result = await supabaseFetch<any[]>(env, '/media', {
    method: 'POST',
    body: JSON.stringify({
      ...media,
      created_at: new Date().toISOString()
    }),
  });
  return result[0];
}

/**
 * 删除条目
 */
export async function deleteEntry(env: Env, id: number): Promise<void> {
  await supabaseFetch(env, `/entries?id=eq.${id}`, {
    method: 'DELETE',
  });
}

/**
 * 根据 ID 删除单张媒体元数据
 */
export async function deleteMedia(env: Env, id: number): Promise<any> {
  return await supabaseFetch(env, `/media?id=eq.${id}`, {
    method: 'DELETE',
  });
}

/**
 * 根据 ID 查询单张媒体记录 (用于获取 r2_key)
 */
export async function selectMediaById(env: Env, id: number): Promise<any> {
  const result = await supabaseFetch<any[]>(env, `/media?id=eq.${id}&select=*`);
  return result[0];
}

/**
 * 查询最后更新时间
 * (获取最新一条记录的 created_at，作为简易的版本号)
 * 注意：由于 Supabase 免费版不一定支持 trigger 记录 update_time，
 * MVP 阶段我们直接取 entries 表中最新的一条记录的创建时间作为依据。
 * 如果要更精确，应该新建一个 global_settings 表来记录 last_data_update
 */
export async function selectLatestUpdate(env: Env): Promise<{ created_at: string } | null> {
  const result = await supabaseFetch<any[]>(env, '/entries?select=created_at&order=created_at.desc&limit=1');
  return result.length > 0 ? result[0] : null;
}
export async function deleteMediaByEntryId(env: Env, entryId: number): Promise<any[]> {
  return await supabaseFetch<any[]>(env, `/media?entry_id=eq.${entryId}`, {
    method: 'DELETE',
  });
}
