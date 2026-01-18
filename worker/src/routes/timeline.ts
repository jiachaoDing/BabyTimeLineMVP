import { Env } from '../index';
import { selectEntries, selectMediaByEntries, insertEntry, updateEntry, deleteEntry, deleteMediaByEntryId, selectAllMilestones, selectLatestUpdate } from '../supabase';
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
  const sort = (url.searchParams.get('sort') === 'asc') ? 'asc' : 'desc';
  const excludePending = url.searchParams.get('exclude_pending') === 'true';

  const offset = (page - 1) * limit;

  // 1. 获取条目 (Supabase 层支持 ilike 搜索)
  const entries = await selectEntries(env, { 
    limit, 
    offset, 
    type, 
    sort,
    // excludeType: excludeMilestones ? 'milestone' : undefined, // 移除旧逻辑
    excludePendingMilestones: excludePending, // 使用新逻辑
    search // 传递搜索关键词
  });
  
  // 以前的内存过滤逻辑已移除，直接使用数据库返回的结果
  const filteredEntries = entries;

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
    // 1. 先查找关联的媒体文件，保存 R2 Key 到内存，以便稍后删除
    const mediaList = await selectMediaByEntries(env, [id]);
    
    // 2. 优先删除数据库记录 (确保业务数据一致性，防止"文件删了但记录还在"的情况)
    // 先删子表 (虽然后端可能有级联删除，显式删除更安全)
    await deleteMediaByEntryId(env, id);
    // 再删主表
    await deleteEntry(env, id);

    // 3. 最后尝试从 R2 删除物理文件
    // 即使这里失败，也不应该报错给前端，因为业务记录已经删除了
    // 使用 Promise.all 并捕获每个删除操作的错误，防止中断
    if (mediaList.length > 0) {
      const deletePromises = mediaList.map(async (media) => {
        if (media.r2_key) {
          try {
            await deleteObject(env, media.r2_key);
          } catch (e) {
            console.error(`Failed to delete R2 object ${media.r2_key}:`, e);
            // 忽略 R2 删除错误，避免回滚数据库事务(如果有)或报错给用户
          }
        }
      });
      await Promise.all(deletePromises);
    }

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
/**
 * 检查数据同步状态
 * 返回最后更新的时间戳，前端可对比本地缓存时间戳来决定是否需要刷新
 */
export async function handleSyncCheck(request: Request, env: Env): Promise<Response> {
  const latest = await selectLatestUpdate(env);
  
  // 返回的时间戳格式：ISO 字符串
  // 如果没有任何数据，返回 null
  return new Response(JSON.stringify({ 
    last_updated: latest ? latest.created_at : null 
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
