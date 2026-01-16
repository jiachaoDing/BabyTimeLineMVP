import { Env } from '../index';
import { selectEntries, selectMediaByEntries, insertEntry, updateEntry, deleteEntry, deleteMediaByEntryId } from '../supabase';
import { deleteObject } from '../r2';

/**
 * 获取时光轴列表
 */
export async function handleGetTimeline(request: Request, env: Env): Promise<Response> {
  // 1. 获取所有条目
  const entries = await selectEntries(env);
  
  if (entries.length === 0) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 2. 获取这些条目关联的所有媒体文件
  const entryIds = entries.map((e: any) => e.id);
  const allMedia = await selectMediaByEntries(env, entryIds);

  // 3. 组合数据并生成代理 URL (带有鉴权 token)
  const result = entries.map((entry: any) => {
    const media = allMedia
      .filter((m: any) => m.entry_id === entry.id)
      .map((m: any) => ({
        ...m,
        // 使用 Worker 代理路径，并通过 query param 传递 token 供 <img> 标签使用
        url: `/api/media/${m.r2_key}?token=${env.FAMILY_TOKEN}`
      }));
    
    return {
      ...entry,
      media
    };
  });

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * 创建或更新日记条目
 */
export async function handleCreateEntry(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as any;
  const { id, title, content, date } = body;

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
      result = await updateEntry(env, id, { title, content, date });
    } else {
      // 新建
      result = await insertEntry(env, { title, content, date });
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
