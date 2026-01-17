import { Env } from '../index';
import { selectEntries, selectMediaByEntries, insertEntry, updateEntry, deleteEntry, deleteMediaByEntryId, selectAllMilestones } from '../supabase';
import { deleteObject } from '../r2';

/**
 * 获取时光轴列表 (支持分页和搜索)
 */
export async function handleGetTimeline(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const type = url.searchParams.get('type') || 'all';
  const search = url.searchParams.get('search') || '';

  const offset = (page - 1) * limit;

  // 1. 获取条目 (这里简化了搜索逻辑，Supabase 支持 .ilike)
  // 注意：如果 search 不为空，需要传递给 selectEntries
  const entries = await selectEntries(env, { limit, offset, type });
  
  // 如果有搜索，简单的过滤 (在实际生产中建议在 Supabase 层做 ilike)
  let filteredEntries = entries;
  if (search) {
    filteredEntries = entries.filter((e: any) => 
      (e.title || '').toLowerCase().includes(search.toLowerCase()) || 
      (e.content || '').toLowerCase().includes(search.toLowerCase())
    );
  }

  if (filteredEntries.length === 0) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 2. 获取关联媒体
  const entryIds = filteredEntries.map((e: any) => e.id);
  const allMedia = await selectMediaByEntries(env, entryIds);

  // 3. 组合数据
  const result = filteredEntries.map((entry: any) => {
    const media = allMedia
      .filter((m: any) => m.entry_id === entry.id)
      .map((m: any) => ({
        ...m,
        url: `/api/media/${m.r2_key}?token=${env.FAMILY_TOKEN}`
      }));
    
    return { ...entry, media };
  });

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * 获取所有勋章 (用于勋章墙)
 */
export async function handleGetMilestones(request: Request, env: Env): Promise<Response> {
  const milestones = await selectAllMilestones(env);
  return new Response(JSON.stringify(milestones), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * 创建或更新日记条目
 */
export async function handleCreateEntry(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as any;
  const { id, title, content, date, type, status } = body;

  if (!content || !date) {
    return new Response(JSON.stringify({ error: 'Content and date are required' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let result;
  try {
    if (id) {
      // 更新
      result = await updateEntry(env, id, { title, content, date, type, status });
    } else {
      // 新建
      result = await insertEntry(env, { title, content, date, type, status });
    }

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 删除条目及其关联的所有媒体
 */
export async function handleDeleteEntry(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const idStr = url.pathname.split('/').pop();
  const id = idStr ? parseInt(idStr) : null;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Entry ID is required' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // 1. 先查找关联的媒体文件以便从 R2 删除
    const mediaList = await selectMediaByEntries(env, [id]);
    
    // 2. 从 R2 删除物理文件
    for (const media of mediaList) {
      if (media.r2_key) {
        await deleteObject(env, media.r2_key);
      }
    }

    // 3. 从 Supabase 删除媒体元数据
    await deleteMediaByEntryId(env, id);

    // 4. 从 Supabase 删除条目
    await deleteEntry(env, id);

    return new Response(JSON.stringify({ success: true, message: 'Entry and associated media deleted' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('Delete Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
