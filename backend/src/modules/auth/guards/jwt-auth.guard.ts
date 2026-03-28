import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    // 公开路由：注册和登录不需要认证
    const publicPaths = ['/api/auth/register', '/api/auth/login', '/api/auth/refresh'];
    if (publicPaths.includes(request.url)) {
      return true;
    }

    return super.canActivate(context);
  }
}
