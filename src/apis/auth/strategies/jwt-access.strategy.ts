// jwt-access.strategy.ts

import { UnauthorizedException, Inject, CACHE_MANAGER } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Cache } from 'cache-manager';

export class JwtAccessStrategy extends PassportStrategy(Strategy, 'access') {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_PASSWORD,
      passReqToCallback: true,
    });
  }

  // ② 첫 번째 인자에 req, 두 번째에 payload가 들어옵니다.
  async validate(req: Request, payload: any) {
    try {
      console.log('===== Access Token 검증 시작 =====');
      console.log('요청 URL:', req.url || (req as any).originalUrl);
      console.log('요청 Method:', req.method);
      
      const authHeader = req.headers['authorization'] ?? '';
      console.log('Authorization 헤더:', authHeader ? `${authHeader.substring(0, 50)}...` : '없음');
      console.log('Authorization 헤더 전체:', authHeader);
      
      const token = authHeader.replace('Bearer ', '').trim();
      console.log('추출된 토큰:', token ? `${token.substring(0, 50)}... (길이: ${token.length})` : '없음');
      
      if (!token) {
        console.error('❌ 토큰이 없습니다!');
        console.log('요청 헤더 전체:', JSON.stringify(req.headers, null, 2));
        throw new UnauthorizedException('토큰이 존재하지 않습니다.');
      }

      // Redis 블랙리스트 체크
      const accessTokenKey = `accessToken:${token}`;
      console.log('🔍 Redis 블랙리스트 체크 중...');
      console.log('  - 체크할 키:', accessTokenKey.substring(0, 50) + '...');
      
      try {
        // 타임아웃 설정 (5초)
        const blacklistedToken = await Promise.race([
          this.cacheManager.get(accessTokenKey),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Redis 타임아웃')), 5000)
          ),
        ]) as any;
        
        if (blacklistedToken) {
          console.error('❌ ============================================');
          console.error('❌ 블랙리스트에 등록된 AccessToken입니다!');
          console.error('❌ 이 토큰은 로그아웃되어 사용할 수 없습니다.');
          console.error('❌ 키:', accessTokenKey.substring(0, 50) + '...');
          console.error('❌ ============================================');
          throw new UnauthorizedException('로그아웃된 토큰입니다.');
        }
        
        console.log('✅ 블랙리스트에 없음 - 정상 토큰입니다.');
      } catch (error) {
        // Redis 연결 실패 시에도 계속 진행 (블랙리스트 체크 스킵)
        if (error instanceof UnauthorizedException) {
          throw error; // 블랙리스트 토큰은 그대로 throw
        }
        console.warn('⚠️ Redis 블랙리스트 체크 실패:', error?.message || error);
        console.warn('⚠️ 블랙리스트 체크를 스킵하고 계속 진행합니다.');
        // 에러가 발생해도 정상 토큰으로 처리하고 계속 진행
      }

      // 유효한 토큰이라면 payload에서 user 정보(id 등)를 꺼내 반환
      console.log('✅ 토큰 검증 성공, User ID:', payload.sub);
      console.log('Payload 전체:', JSON.stringify(payload, null, 2));
      console.log('=====================================');
      
      return { id: payload.sub };
    } catch (error) {
      console.error('❌ validate 함수 에러:', error);
      console.error('에러 메시지:', error?.message);
      console.error('에러 스택:', error?.stack);
      throw error;
    }
  }
}
