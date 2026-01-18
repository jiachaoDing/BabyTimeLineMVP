/// <reference types="@cloudflare/workers-types" />
import { handleLogin } from './routes/auth';
import { handleGetTimeline, handleCreateEntry, handleDeleteEntry, handleGetMilestones, handleSyncCheck } from './routes/timeline';
import { handleUpload } from './routes/upload';
import { handleGetMedia, handleDeleteMedia } from './routes/media';

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  R2_BUCKET: R2Bucket;
  FAMILY_PASSWORD: string;
  FAMILY_TOKEN: string; // 用于 API 校验的 Token
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // 允许跨域 (CORS) - 针对 MVP 开发方便
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // 登录接口无需校验 Token
    if (path === '/api/login' && request.method === 'POST') {
      return handleLogin(request, env);
    }

    // 1. 权限校验拦截器
    // 仅对 /api/* 路径下的接口进行校验（排除登录接口 /api/login）
    if (path.startsWith('/api/') && path !== '/api/login') {
      // 支持两种鉴权方式：
      // a) Authorization Header (AJAX 请求使用)
      // b) URL Query Params "token" (用于 <img> 标签请求媒体文件)
      const authHeader = request.headers.get('Authorization');
      let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
      
      if (!token) {
        token = url.searchParams.get('token');
      }

      if (!token || token !== env.FAMILY_TOKEN) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
          status: 401,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // 2. 路由分发
    let response: Response;
    try {
      if (path.startsWith('/api/media/') && request.method === 'GET') {
        response = await handleGetMedia(request, env);
      } else if (path.startsWith('/api/media/') && request.method === 'DELETE') {
        response = await handleDeleteMedia(request, env);
      } else if (path === '/api/timeline' && request.method === 'GET') {
        response = await handleGetTimeline(request, env);
      } else if (path === '/api/milestones' && request.method === 'GET') {
        response = await handleGetMilestones(request, env);
      } else if (path === '/api/sync-check' && request.method === 'GET') {
        response = await handleSyncCheck(request, env);
      } else if (path === '/api/entry' && request.method === 'POST') {
        response = await handleCreateEntry(request, env);
      } else if (path.startsWith('/api/entry/') && request.method === 'DELETE') {
        response = await handleDeleteEntry(request, env);
      } else if (path === '/api/upload' && request.method === 'POST') {
        response = await handleUpload(request, env);
      } else {
        // 如果静态资源没找到，且不是 API 路径，返回 404
        response = new Response('Not Found', { status: 404 });
      }
    } catch (err: any) {
      console.error('API Error:', err);
      response = new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 为所有 API 响应添加 CORS (如果响应还没设置的话)
    const newHeaders = new Headers(response.headers);
    if (!newHeaders.has('Access-Control-Allow-Origin')) {
      newHeaders.set('Access-Control-Allow-Origin', '*');
    }
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },
};
