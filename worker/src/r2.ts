import { Env } from './index';

/**
 * 生成 R2 对象 Key
 * 格式: YYYY-MM-DD/timestamp-randomhex.ext
 */
export function generateR2Key(filename: string): string {
  const date = new Date().toISOString().split('T')[0];
  const timestamp = Date.now();
  const randomHex = Math.random().toString(16).slice(2, 8);
  const extension = filename.split('.').pop() || 'jpg';
  
  return `${date}/${timestamp}-${randomHex}.${extension}`;
}

/**
 * 上传文件到 R2
 */
export async function putObject(env: Env, key: string, file: File | ArrayBuffer, contentType: string) {
  await env.R2_BUCKET.put(key, file, {
    httpMetadata: { contentType },
  });
  return key;
}

/**
 * 从 R2 删除文件
 */
export async function deleteObject(env: Env, key: string) {
  await env.R2_BUCKET.delete(key);
}
