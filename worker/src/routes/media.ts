import { Env } from '../index';

/**
 * 代理获取 R2 媒体文件
 * 支持通过 URL 参数 token 进行鉴权 (用于 <img> 标签)
 */
export async function handleGetMedia(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  // 从路径中提取 key，例如 /api/media/2026-01-16/xxx.jpg
  // 注意：key 可能包含多级目录，所以这里使用 replace
  const key = url.pathname.replace('/api/media/', '');

  if (!key) {
    return new Response(JSON.stringify({ error: 'Key required' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // 从 R2 获取对象
    const object = await env.R2_BUCKET.get(key);

    if (!object) {
      return new Response('Object Not Found', { status: 404 });
    }

    // 构造响应头，保留原始媒体信息 (contentType 等)
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    
    // 设置私有缓存，防止中间节点缓存私密图片，但允许浏览器缓存以提高性能
    headers.set('Cache-Control', 'private, max-age=3600'); 
    
    // 允许跨域
    headers.set('Access-Control-Allow-Origin', '*');

    return new Response(object.body, {
      headers,
    });
  } catch (err: any) {
    console.error('R2 Get Error:', err);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
