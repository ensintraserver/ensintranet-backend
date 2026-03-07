// 리프레시토큰을 인가해주기 위한 stratey 클래스를 만들어보자
// Bearer에서 가져오는게 아니라 쿠키에서 리프레시토큰을 뽑아오고 그걸 검증해야된다
import { UnauthorizedException, Inject, CACHE_MANAGER } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { parseCookies, getCookieValue } from 'src/commons/utils/cookie.util';
import { Cache } from 'cache-manager';

export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'refresh') {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {
    super({
      // ✅ 쿠키 제대로 파싱하기 (통일된 파싱 함수 사용)
      jwtFromRequest: (req) => {
        console.log('===== 쿠키 수신 =====');
        const cookieHeader = req.headers.cookie;
        console.log('전체 쿠키:', cookieHeader);
        console.log('쿠키 타입:', typeof cookieHeader, Array.isArray(cookieHeader));

        if (!cookieHeader) {
          console.log('⚠️ 쿠키가 없습니다!');
          return null;
        }

        // 통일된 쿠키 파싱 함수 사용
        const refreshToken = getCookieValue(cookieHeader, 'refreshToken');
        console.log('파싱된 쿠키:', parseCookies(cookieHeader));
        console.log('추출된 refreshToken:', refreshToken ? '존재함' : '없음');
        console.log('====================');

        return refreshToken || null;
      },
      secretOrKey: process.env.JWT_REFRESH_PASSWORD,
      passReqToCallback: true,
    });
  }

  // 위의 리프레시를 지나서 통과하면 밑으로 가고 req.user생생되어서 그게 req에 담겨서 들어가게 되고 -> 그거로 accessToken을 재발급받는다

  async validate(req: any, payload: any) {
    // req.headers.cookie와 req.get('cookie') 모두 확인 (사파리 호환성)
    const cookieHeader = req.headers?.cookie || req.get?.('cookie') || '';
    console.log('validate에서 쿠키 확인:', cookieHeader);
    console.log('validate 쿠키 타입:', typeof cookieHeader, Array.isArray(cookieHeader));

    // 통일된 쿠키 파싱 함수 사용
    const refreshToken = getCookieValue(cookieHeader, 'refreshToken');

    if (!refreshToken) {
      console.log('⚠️ validate에서 리프레시 토큰이 없습니다.');
      throw new UnauthorizedException('리프레시 토큰이 존재하지 않습니다.');
    }

    // Redis 블랙리스트 체크
    const refreshTokenKey = `refreshToken:${refreshToken}`;
    console.log('🔍 Redis 블랙리스트 체크 중...');
    console.log('  - 체크할 키:', refreshTokenKey.substring(0, 50) + '...');
    
    try {
      // 타임아웃 설정 (5초)
      const blacklistedToken = await Promise.race([
        this.cacheManager.get(refreshTokenKey),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Redis 타임아웃')), 5000)
        ),
      ]) as any;
      
      if (blacklistedToken) {
        console.error('❌ ============================================');
        console.error('❌ 블랙리스트에 등록된 RefreshToken입니다!');
        console.error('❌ 이 토큰은 로그아웃되어 사용할 수 없습니다.');
        console.error('❌ 키:', refreshTokenKey.substring(0, 50) + '...');
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

    return { id: payload.sub };
  }
}
