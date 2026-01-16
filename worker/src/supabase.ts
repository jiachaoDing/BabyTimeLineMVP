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
 * 查询所有日记条目
 */
export async function selectEntries(env: Env): Promise<any[]> {
  // 按日期降序排列
  return await supabaseFetch<any[]>(env, '/entries?select=*&order=date.desc');
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
export async function insertEntry(env: Env, entry: { title?: string; content: string; date: string }) {
  const result = await supabaseFetch(env, '/entries', {
    method: 'POST',
    body: JSON.stringify(entry),
  });
  return (result as any[])[0];
}

/**
 * 更新条目
 */
export async function updateEntry(env: Env, id: number, entry: { title?: string; content?: string; date?: string }) {
  const result = await supabaseFetch(env, `/entries?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(entry),
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
 * 根据条目 ID 删除媒体元数据
 */
export async function deleteMediaByEntryId(env: Env, entryId: number): Promise<any[]> {
  return await supabaseFetch<any[]>(env, `/media?entry_id=eq.${entryId}`, {
    method: 'DELETE',
  });
}
