import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from 'src/commons/decorators/public.decorator';

@Injectable()
export class GqlAuthGuardGlobal extends AuthGuard('access') {
  constructor(private reflector: Reflector) {
    super();
  }

  getRequest(context: ExecutionContext) {
    // ✅ HTTP 요청이면 HTTP req
    if (context.getType() === 'http') {
      return context.switchToHttp().getRequest();
    }
    // ✅ GraphQL 요청이면 GraphQL req
    const gqlContext = GqlExecutionContext.create(context);
    return gqlContext.getContext().req;
  }

  canActivate(context: ExecutionContext) {
    const req = this.getRequest(context);
    const url = req?.url ?? req?.originalUrl ?? '';
    const originalUrl = req?.originalUrl ?? '';
    const method = req?.method ?? '';

    console.log('===== Guard 검증 시작 =====');
    console.log('요청 URL:', url);
    console.log('원본 URL:', originalUrl);
    console.log('요청 Method:', method);
    console.log('Authorization 헤더:', req.headers?.authorization ? '존재' : '없음');
    console.log('쿠키:', req.headers?.cookie ? '존재' : '없음');

    // ✅ Render Health Check 예외 처리
    if (url === '/healthz' || url.startsWith('/healthz')) {
      console.log('✅ Health Check 요청 - 인증 스킵');
      return true;
    }

    // ✅ GraphQL 경로 예외 처리 (Vercel 프록시로 인해 URL이 변경될 수 있음)
    const isGraphQLPath = url === '/graphql' || url.startsWith('/graphql') || url === '/';
    
    if (isGraphQLPath) {
      // GET 요청은 introspection/Playground용으로 허용
      if (method === 'GET') {
        console.log('✅ GraphQL GET 요청 - 인증 스킵');
        return true;
      }
      // POST 요청은 인증 필요 (아래로 진행)
      console.log('🔒 GraphQL POST 요청 - 인증 필요');
    }

    // ✅ 루트 경로 GET/HEAD 요청 예외 처리 (Render 헬스 체크)
    if (url === '/' && (method === 'GET' || method === 'HEAD')) {
      console.log('✅ 루트 경로 GET/HEAD 요청 - 인증 스킵');
      return true;
    }

    // 기존 Public 데코레이터 로직 유지
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      console.log('✅ Public 데코레이터 - 인증 스킵');
      return true;
    }

    console.log('🔒 인증 필요 - Guard 통과');
    console.log('=====================================');
    
    return super.canActivate(context) as any;
  }

  handleRequest(err: any, user: any, info: any, context: any) {
    console.log('===== Guard handleRequest =====');
    console.log('에러:', err ? err.message : '없음');
    console.log('사용자:', user ? `User ID: ${user.id}` : '없음');
    console.log('Info:', info);
    console.log('=====================================');
    
    if (err || !user) {
      console.error('❌ 인증 실패:', err?.message || info?.message || '사용자 없음');
    }
    
    return super.handleRequest(err, user, info, context);
  }
}

// import { ExecutionContext, Injectable } from '@nestjs/common';
// import { Reflector } from '@nestjs/core';
// import { GqlExecutionContext } from '@nestjs/graphql';
// import { AuthGuard } from '@nestjs/passport';
// import { IS_PUBLIC_KEY } from 'src/commons/decorators/public.decorator';

// @Injectable()
// export class GqlAuthGuardGlobal extends AuthGuard('access') {
//   constructor(private reflector: Reflector) {
//     super();
//   }

//   getRequest(context: ExecutionContext) {
//     const gqlContext = GqlExecutionContext.create(context);
//     return gqlContext.getContext().req;
//   }

//   canActivate(context: ExecutionContext) {
//     const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
//       context.getHandler(),
//       context.getClass(),
//     ]);

//     if (isPublic) {
//       return true;
//     }

//     return super.canActivate(context);
//   }
// }
