// auth.resolver.ts

import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { IContext } from 'src/commons/interfaces/context';
import { GqlAuthGuard } from './guards/gql-auth.guard';
import {
  UnauthorizedException,
  UseGuards,
  Inject,
  CACHE_MANAGER,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { Public } from 'src/commons/decorators/public.decorator';
import { getCookieValue } from 'src/commons/utils/cookie.util';
import { Cache } from 'cache-manager';

@Resolver()
export class AuthResolver {
  constructor(
    private readonly authService: AuthService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  @Public()
  @Mutation(() => String)
  async login(
    @Args('customId') customId: string, //
    @Args('password') password: string,
    @Args('keepLoggedIn', { nullable: true, defaultValue: false }) keepLoggedIn: boolean,
    @Context() context: IContext,
  ): Promise<string> {
    return this.authService.login({ customId, password, context, keepLoggedIn });
  }

  // //리스토어함수에서 해줘야할일
  // // 1. 리프레시토큰 인가  -> 2. 액세스토큰 재발급
  @Public()
  @UseGuards(GqlAuthGuard('refresh'))
  @Mutation(() => String)
  restoreAccessToken(@Context() context: IContext): string {
    return this.authService.restoreAccessToken({ user: context.req.user });
  }

  //
  // 로그아웃 구조
  // 우선 로그아웃을 하고 싶은 유저가 액세스토큰이랑 리프레시토큰을 서버에 전달하면 그게 유효한건지부터 체크 -> 유효하다면 그 토큰들을 redis에 저장해놓음으로써 로그아웃블랙리스트에 올려놓음 -> 해당 유저가 블랙리스트에 있는 토큰으로 요청을 하면 튕김 + 토큰이 만료되면 redis에서도 토큰이 없어지는데 이게 문제가 안되는 이유는 토큰이 어 차 피 만료되었으니까 요청을 해도 그냥 튕기는거임

  @Mutation(() => String)
  async logout(@Context() context: IContext): Promise<string> {
    console.log('\n===== 로그아웃 요청 시작 =====');
    const { req } = context;
    const authHeader = req.headers.authorization || '';
    const accessToken = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;
    // 쿠키에서 리프레시토큰 가져오기 (통일된 파싱 함수 사용)
    const cookieHeader = req.headers.cookie;
    const refreshToken = getCookieValue(cookieHeader, 'refreshToken');

    console.log('📋 토큰 추출 결과:');
    console.log('  - AccessToken:', accessToken ? `${accessToken.substring(0, 30)}... (길이: ${accessToken.length})` : '없음');
    console.log('  - RefreshToken:', refreshToken ? `${refreshToken.substring(0, 30)}... (길이: ${refreshToken.length})` : '없음');

    if (!accessToken || !refreshToken) {
      console.error('❌ 토큰이 존재하지 않습니다.');
      throw new UnauthorizedException('토큰이 존재하지 않습니다.');
    }

    let decodedAT: any;
    let decodedRT: any;

    try {
      console.log('🔐 토큰 검증 중...');
      decodedAT = jwt.verify(accessToken, process.env.JWT_PASSWORD);
      decodedRT = jwt.verify(refreshToken, process.env.JWT_REFRESH_PASSWORD);
      console.log('✅ 토큰 검증 성공');
      console.log('  - AccessToken User ID:', decodedAT.sub);
      console.log('  - RefreshToken User ID:', decodedRT.sub);
    } catch (err) {
      console.error('❌ 토큰 검증 실패:', err.message);
      throw new UnauthorizedException('토큰 검증에 실패했습니다.');
    }

    // Redis에 토큰을 블랙리스트로 저장
    const accessTokenKey = `accessToken:${accessToken}`;
    const refreshTokenKey = `refreshToken:${refreshToken}`;

    // 각 토큰의 만료 시간 계산 (exp는 초 단위)
    const accessTokenExp = decodedAT.exp;
    const refreshTokenExp = decodedRT.exp;
    const now = Math.floor(Date.now() / 1000); // 현재 시간(초)

    // TTL 계산 (만료 시간까지 남은 초)
    const accessTokenTTL = accessTokenExp - now;
    const refreshTokenTTL = refreshTokenExp - now;

    console.log('⏰ 토큰 만료 시간 정보:');
    console.log('  - AccessToken 만료 시간:', new Date(accessTokenExp * 1000).toISOString());
    console.log('  - RefreshToken 만료 시간:', new Date(refreshTokenExp * 1000).toISOString());
    console.log('  - AccessToken TTL (초):', accessTokenTTL);
    console.log('  - RefreshToken TTL (초):', refreshTokenTTL);

    // TTL이 0보다 큰 경우에만 Redis에 저장
    let savedTokens = [];
    
    // AccessToken 저장
    if (accessTokenTTL > 0) {
      try {
        await Promise.race([
          this.cacheManager.set(accessTokenKey, 'accessToken', {
            ttl: accessTokenTTL,
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Redis 타임아웃')), 5000)
          ),
        ]);
        savedTokens.push('AccessToken');
        console.log(`✅ AccessToken 블랙리스트 저장 완료 (키: ${accessTokenKey.substring(0, 50)}...)`);
      } catch (error) {
        console.warn('⚠️ AccessToken Redis 저장 실패:', error?.message || error);
        console.warn('⚠️ 블랙리스트 기능이 제한적으로 작동할 수 있습니다.');
      }
    } else {
      console.warn('⚠️ AccessToken이 이미 만료되어 블랙리스트에 저장하지 않습니다.');
    }

    // RefreshToken 저장
    if (refreshTokenTTL > 0) {
      try {
        await Promise.race([
          this.cacheManager.set(refreshTokenKey, 'refreshToken', {
            ttl: refreshTokenTTL,
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Redis 타임아웃')), 5000)
          ),
        ]);
        savedTokens.push('RefreshToken');
        console.log(`✅ RefreshToken 블랙리스트 저장 완료 (키: ${refreshTokenKey.substring(0, 50)}...)`);
      } catch (error) {
        console.warn('⚠️ RefreshToken Redis 저장 실패:', error?.message || error);
        console.warn('⚠️ 블랙리스트 기능이 제한적으로 작동할 수 있습니다.');
      }
    } else {
      console.warn('⚠️ RefreshToken이 이미 만료되어 블랙리스트에 저장하지 않습니다.');
    }

    // Redis 저장 확인
    try {
      const verifyAccessToken = await Promise.race([
        this.cacheManager.get(accessTokenKey),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Redis 타임아웃')), 3000)
        ),
      ]) as any;
      
      const verifyRefreshToken = await Promise.race([
        this.cacheManager.get(refreshTokenKey),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Redis 타임아웃')), 3000)
        ),
      ]) as any;
      
      console.log('🔍 Redis 저장 확인:');
      console.log('  - AccessToken 저장 확인:', verifyAccessToken ? '✅ 저장됨' : '❌ 저장 안됨');
      console.log('  - RefreshToken 저장 확인:', verifyRefreshToken ? '✅ 저장됨' : '❌ 저장 안됨');
    } catch (error) {
      console.warn('⚠️ Redis 저장 확인 실패:', error?.message || error);
      console.warn('⚠️ 저장은 완료되었을 수 있지만 확인할 수 없습니다.');
    }
    console.log('==============================\n');

    return `로그아웃에 성공했습니다. (블랙리스트에 저장된 토큰: ${savedTokens.join(', ')})`;
  }

  @Public()
  @Mutation(() => String)
  async sendPasswordResetLink(@Args('email') email: string): Promise<string> {
    return this.authService.sendPasswordResetLink({ email });
  }

  @Public()
  @Mutation(() => String)
  async resetPassword(
    @Args('token') token: string,
    @Args('newPassword') newPassword: string,
  ): Promise<string> {
    return this.authService.resetPassword({ token, newPassword });
  }
}
