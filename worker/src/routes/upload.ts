import { Env } from '../index';
import { generateR2Key, putObject } from '../r2';
import { insertMedia, insertEntry } from '../supabase';

/**
 * 处理上传请求 (Multipart/form-data)
 */
export async function handleUpload(request: Request, env: Env): Promise<Response> {
  const formData = await request.formData();
  // 获取所有上传的文件
  const files = formData.getAll('file') as unknown as File[];
  let entryIdStr = formData.get('entry_id') as string | null;
  const title = (formData.get('title') as string) || '';
  const content = (formData.get('content') as string) || '';
  const date = (formData.get('date') as string) || new Date().toISOString().split('T')[0];
  const type = (formData.get('type') as string) || 'daily';
  const status = (formData.get('status') as string) || 'completed';

  // 1. 如果没有 entry_id，说明是新动态，先创建 entry
  let entryId: number;
  if (!entryIdStr) {
    if (!content && files.length === 0) {
      return new Response(JSON.stringify({ error: 'Content or file is required for new entry' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const newEntry = await insertEntry(env, { title, content, date, type, status });
    entryId = newEntry.id;
  } else {
    entryId = parseInt(entryIdStr);
  }

  // 2. 循环处理文件上传
  const uploadedMedia = [];
  for (const file of files) {
    if (file && file.size > 0) {
      // 校验文件类型 (仅限图片)
      if (!file.type.startsWith('image/')) {
        continue; // 跳过非图片文件
      }

      // 生成 R2 Key 并上传
      const r2Key = generateR2Key(file.name);
      await putObject(env, r2Key, await file.arrayBuffer(), file.type);

      // 3. 将媒体信息存入 Supabase
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
    message: uploadedMedia.length > 0 ? `Uploaded ${uploadedMedia.length} files` : 'Entry created without images'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
