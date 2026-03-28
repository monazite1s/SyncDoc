import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 需要认证保护的路由
const protectedPaths = ['/documents', '/settings'];
// 已认证用户不应访问的路由（如登录/注册）
const authPaths = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('access_token')?.value;

  // 保护需要认证的路由
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));
  if (isProtected && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 已认证用户访问登录/注册页面时重定向到文档页
  const isAuthPage = authPaths.some((path) => pathname.startsWith(path));
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/documents', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
