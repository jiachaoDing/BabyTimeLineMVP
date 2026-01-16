import { Env } from '../index';
import { generateR2Key, putObject } from '../r2';
import { insertMedia, insertEntry } from '../supabase';

/**
 * 处理上传请求 (Multipart/form-data)
 */
export async function handleUpload(request: Request, env: Env): Promise<Response> {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  let entryIdStr = formData.get('entry_id') as string | null;
  const title = (formData.get('title') as string) || '';
  const content = (formData.get('content') as string) || '';
  const date = (formData.get('date') as string) || new Date().toISOString().split('T')[0];

  // 1. 如果没有 entry_id，说明是新动态，先创建 entry
  let entryId: number;
  if (!entryIdStr) {
    if (!content) {
      return new Response(JSON.stringify({ error: 'Content is required for new entry' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const newEntry = await insertEntry(env, { title, content, date });
    entryId = newEntry.id;
  } else {
    entryId = parseInt(entryIdStr);
  }

  // 2. 处理文件上传 (可选)
  if (file && file.size > 0) {
    // 校验文件类型
    if (!file.type.startsWith('image/')) {
      return new Response(JSON.stringify({ error: 'Only image files are allowed' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 生成 R2 Key 并上传
    const r2Key = generateR2Key(file.name);
    await putObject(env, r2Key, await file.arrayBuffer(), file.type);

    // 3. 将媒体信息存入 Supabase
    const media = await insertMedia(env, {
      entry_id: entryId,
      r2_key: r2Key,
      file_type: file.type,
      taken_at: date // 默认使用条目日期作为拍摄日期
    });

    return new Response(JSON.stringify({
      id: media.id,
      entry_id: entryId,
      r2_key: r2Key,
      // 返回代理 URL，带有 token
      url: `/api/media/${r2Key}?token=${env.FAMILY_TOKEN}`
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 如果没有文件上传，只返回 entry_id
  return new Response(JSON.stringify({
    entry_id: entryId,
    message: 'Entry created/updated without image'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
