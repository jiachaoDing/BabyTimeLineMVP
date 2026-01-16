import { Env } from '../index';

/**
 * 处理登录请求
 */
export async function handleLogin(request: Request, env: Env): Promise<Response> {
  try {
    const { password } = await request.json() as { password?: string };

    if (!password) {
      return new Response(JSON.stringify({ error: 'Password is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 比较密码
    if (password === env.FAMILY_PASSWORD) {
      // 登录成功，返回预设的 FAMILY_TOKEN
      return new Response(JSON.stringify({ 
        token: env.FAMILY_TOKEN,
        message: 'Login successful' 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 密码错误
    return new Response(JSON.stringify({ error: 'Invalid password' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
