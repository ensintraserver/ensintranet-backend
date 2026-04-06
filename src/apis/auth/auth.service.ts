import {
  Injectable,
  UnprocessableEntityException,
  NotFoundException,
  BadRequestException,
  Inject,
  CACHE_MANAGER,
  Logger,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import {
  IAuthServiceGetAccessToken,
  IAuthServiceLogin,
  IAuthServiceRestoreAccessToken,
  IAuthServiceSetRefreshToken,
  IAuthServiceSendPasswordResetLink,
  IAuthServiceResetPassword,
  // IAuthServiceRestoreAccessToken,
  // IAuthServiceSetRefreshToken,
} from './interfaces/auth-service.interfaces';
import { JwtService } from '@nestjs/jwt';
import { Cache } from 'cache-manager';
import * as jwt from 'jsonwebtoken';
import { Resend } from 'resend';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly resend = new Resend(process.env.RESEND_API_KEY);

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async login({
    customId,
    password,
    context,
    keepLoggedIn = false,
  }: // context,
  IAuthServiceLogin): Promise<string> {
    const isDev = process.env.NODE_ENV !== 'production';

    // 1. customId로 유저를 DB에서 찾기
    const user = await this.usersService.findOneByCustomId({ customId });

    // 2. 일치하는 유저가 없으면?! 에러 던지기!!!
    if (!user) {
      if (isDev) {
        this.logger.warn(`[login] customId not found: ${customId}`);
      }
      throw new UnprocessableEntityException(
        '아이디 혹은 비밀번호가 틀렸습니다. 아이디를 확인해 주세요.',
      );
    }

    // 3. 일치하는 유저가 있지만, 비밀번호가 틀렸다면?!
    const isAuth = await bcrypt.compare(password, user.password);
    if (!isAuth) {
      if (isDev) {
        this.logger.warn(`[login] wrong password for customId: ${customId}`);
      }
      throw new UnprocessableEntityException(
        '아이디 혹은 비밀번호가 틀렸습니다. 비밀번호를 확인해 주세요.',
      );
    }

    // 4. refreshToken(=JWT)을 만들어서 브라우저 쿠키에 저장해서 보내주기
    this.setRefreshToken({ user, context, keepLoggedIn });

    // 5. 일치하는 유저도 있고, 비밀번호도 맞았다면?!
    //    => accessToken(=JWT)을 만들어서 브라우저에 전달하기
    return this.getAccessToken({ user });
  }

  // 액세스토큰 '재발급' 함수
  restoreAccessToken({ user }: IAuthServiceRestoreAccessToken): string {
    return this.getAccessToken({ user });
    // 액세스 토큰을 만들어주는 함수는 아래에서 만든걸 가져다 쓰면 된다
  }

  // // 리프레시 토큰 발급 함수
  // setRefreshToken({ user, context }: IAuthServiceSetRefreshToken): void {
  //   const refreshToken = this.jwtService.sign(
  //     { sub: user.id },
  //     // 나중에 이런 비밀번호들은 env에 다 빼둬야한다
  //     { secret: process.env.JWT_REFRESH_PASSWORD, expiresIn: '2w' },
  //   );

  //   // 개발환경

    // context.res.setHeader(
    //   'set-Cookie',
    //   `refreshToken=${refreshToken}; path=/;`,
    // );

    // 개발환경 설정 (localhost 간 통신)
    // context.res.setHeader(
    //   'set-Cookie',
    //   `refreshToken=${refreshToken}; path=/; HttpOnly; SameSite=Lax; Max-Age=1209600`,
    // );

  //   // [배포환경에서는 아래와 같이 작성하자]
  //   // domain은 내가 배포할 사이트 주소(앞에 점.을 꼭 붙여줘야한다), 주소가 틀리면 쿠키를 전달 안하게 만들 수 있다
  //   // context.res.setHeader('set-Cookie', `refreshToken=${refreshToken}; path=/; domain=.mybacksite.com; SameSite=None; Secure; httpOnly`);
  //   // 누가 사용가능한지 명확하게 지정해주는 부분 -> 뒤쪽에 프론트엔드(브라우저) 주소를 작성해준다
  //   // context.res.setHeader('Access-Control-Allow-Origin', 'https://myfrontsite.com');
  // }
  setRefreshToken({ user, context, keepLoggedIn = false }: IAuthServiceSetRefreshToken): void {
    const isProduction = process.env.NODE_ENV === 'production';

    // keepLoggedIn에 따라 쿠키 설정 결정
    // 토큰 자체는 항상 2주 유효하지만, 쿠키 만료 시간은 다르게 설정
    let maxAge: number | undefined;
    let expiresString: string | undefined;

    if (keepLoggedIn) {
      // 로그인 상태 유지 ON: 2주간 유지
      maxAge = 1209600; // 2주 = 14일 = 1209600초
      const expiresDate = new Date(Date.now() + maxAge * 1000);
      expiresString = expiresDate.toUTCString();
    } else {
      // 로그인 상태 유지 OFF: Session Cookie (브라우저 닫으면 삭제)
      maxAge = undefined; // Session Cookie는 Max-Age/Expires 없음
      expiresString = undefined;
    }

    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      { secret: process.env.JWT_REFRESH_PASSWORD, expiresIn: '2w' },
    );

    // 쿠키 값 URL 인코딩 (사파리 호환성) - 반드시 필요!
    const encodedToken = encodeURIComponent(refreshToken);

    // 쿠키 값 검증을 위한 디버깅 로그
    console.log('===== 쿠키 값 검증 =====');
    console.log('원본 토큰:', refreshToken);
    console.log('인코딩된 토큰:', encodedToken);
    console.log('원본 토큰 길이:', refreshToken.length);
    console.log('인코딩된 토큰 길이:', encodedToken.length);

    // 인코딩이 제대로 되었는지 확인
    if (refreshToken === encodedToken) {
      console.warn('⚠️ 쿠키 값이 인코딩되지 않았습니다!');
    } else {
      console.log('✅ 쿠키 값이 제대로 인코딩되었습니다');
    }

    // 쿠키 크기 확인 (사파리 제한: 4KB)
    if (encodedToken.length > 4000) {
      console.warn('⚠️ 쿠키 값이 너무 큽니다:', encodedToken.length, 'bytes');
    } else {
      console.log('✅ 쿠키 크기 OK:', encodedToken.length, 'bytes');
    }
    console.log('========================');

    // 사파리 호환성을 위한 쿠키 속성 순서 (권장 순서)
    // 속성 순서: Path → HttpOnly → SameSite → Secure → Max-Age → Expires
    let cookieString: string;

    // Session Cookie인 경우 Max-Age와 Expires를 포함하지 않음
    const expirationParts: string[] = [];
    if (maxAge !== undefined) {
      expirationParts.push(`Max-Age=${maxAge}`);
    }
    if (expiresString) {
      expirationParts.push(`Expires=${expiresString}`);
    }
    const expirationString = expirationParts.length > 0 ? expirationParts.join('; ') + '; ' : '';

    if (isProduction) {
      // 배포 환경: 프록시 사용 시 같은 도메인이므로 SameSite=Lax 사용 (사파리 호환성 향상)
      cookieString = `refreshToken=${encodedToken}; Path=/; ${expirationString}Secure; HttpOnly; SameSite=Lax`;
    } else {
      // 개발 환경: 프론트엔드가 HTTPS를 사용하는 경우를 대비해 항상 SameSite=None; Secure 사용
      // cross-origin 쿠키 전달을 위해 SameSite=None과 Secure가 모두 필요
      cookieString = `refreshToken=${encodedToken}; Path=/; ${expirationString}Secure; HttpOnly; SameSite=None`;
    }

    // 디버깅: cookieString 자체 확인
    console.log('===== 쿠키 문자열 검증 =====');
    console.log('cookieString:', cookieString);
    console.log(
      'cookieString에 encodedToken 포함 여부:',
      cookieString.includes(encodedToken),
    );
    console.log(
      'cookieString에 원본 토큰 포함 여부:',
      cookieString.includes(refreshToken),
    );
    console.log('================================');

    // GraphQL 응답에서 쿠키가 제대로 전달되도록 명시적으로 설정
    if (context.res && typeof context.res.setHeader === 'function') {
      // 기존 헤더 제거
      try {
        context.res.removeHeader('Set-Cookie');
      } catch (error) {
        // removeHeader가 없으면 무시
      }

      // setHeader 직전 헤더 확인
      const beforeHeader = context.res.getHeader('Set-Cookie');
      console.log('setHeader 직전 헤더:', beforeHeader);

      // 쿠키 문자열에 원본 토큰이 포함되어 있는지 확인하고 강제로 인코딩된 값으로 교체
      let finalCookieString = cookieString;
      if (cookieString.includes(refreshToken) && !cookieString.includes(encodedToken)) {
        console.warn('⚠️ 쿠키 문자열에 원본 토큰이 포함되어 있습니다. 인코딩된 값으로 교체합니다.');
        // 정규식으로 안전하게 교체 (특수문자 이스케이프)
        const escapedToken = refreshToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        finalCookieString = cookieString.replace(
          new RegExp(`refreshToken=${escapedToken}`, 'g'),
          `refreshToken=${encodedToken}`
        );
        console.log('✅ 인코딩된 값으로 교체 완료');
      }

      // 헤더 설정
      context.res.setHeader('Set-Cookie', finalCookieString);

      // setHeader 직후 헤더 확인
      const afterHeader = context.res.getHeader('Set-Cookie');
      console.log('setHeader 직후 헤더:', afterHeader);
      console.log('✅ 쿠키 설정 완료');
      console.log('✅ 쿠키 문자열 길이:', finalCookieString.length);
      console.log('✅ 환경:', isProduction ? 'Production' : 'Development');

      // 인코딩 확인: 헤더에 실제로 인코딩된 값이 들어갔는지 확인
      if (afterHeader) {
        let headerValue: string;

        // 배열인 경우 처리
        if (Array.isArray(afterHeader)) {
          headerValue = afterHeader[0] || '';
        } else {
          headerValue = afterHeader.toString();
        }

        console.log(
          '헤더 값 타입:',
          typeof afterHeader,
          Array.isArray(afterHeader),
        );
        console.log('헤더 값:', headerValue);

        if (headerValue.includes('refreshToken=')) {
          const tokenInHeader = headerValue
            .split('refreshToken=')[1]
            ?.split(';')[0]
            ?.trim();

          if (tokenInHeader) {
            console.log('헤더에서 추출한 토큰:', tokenInHeader);
            console.log('원본 토큰과 비교:', tokenInHeader === refreshToken);
            console.log(
              '인코딩된 토큰과 비교:',
              tokenInHeader === encodedToken,
            );

            if (tokenInHeader === refreshToken) {
              console.error(
                '❌ 쿠키 값이 인코딩되지 않았습니다! 헤더에 원본 토큰이 있습니다.',
              );
              console.error('원본 토큰:', tokenInHeader);

              // 강제로 다시 인코딩하여 설정 시도
              console.log('🔄 인코딩된 값으로 다시 설정 시도...');
              const escapedToken = refreshToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const retryCookieString = headerValue.replace(
                new RegExp(`refreshToken=${escapedToken}`, 'g'),
                `refreshToken=${encodedToken}`
              );
              context.res.setHeader('Set-Cookie', retryCookieString);
              console.log(
                '재설정 후 헤더:',
                context.res.getHeader('Set-Cookie'),
              );
            } else if (tokenInHeader === encodedToken) {
              console.log(
                '✅ 쿠키 값이 제대로 인코딩되어 헤더에 설정되었습니다.',
              );
            } else {
              console.warn('⚠️ 헤더의 토큰 값이 예상과 다릅니다.');
              console.warn(
                '헤더의 토큰 (처음 50자):',
                tokenInHeader.substring(0, 50),
              );
              console.warn(
                '예상 인코딩 (처음 50자):',
                encodedToken.substring(0, 50),
              );
              console.warn(
                '원본 토큰 (처음 50자):',
                refreshToken.substring(0, 50),
              );
            }
          }
        }
      }
    } else {
      console.error(
        '❌ context.res가 없거나 setHeader 메서드가 없습니다:',
        context,
      );
    }
  }

  getAccessToken({ user }: IAuthServiceGetAccessToken): string {
    return this.jwtService.sign(
      { sub: user.id },

      { secret: process.env.JWT_PASSWORD, expiresIn: '1h' },
    );
  }

  async sendPasswordResetLink({ email }: IAuthServiceSendPasswordResetLink): Promise<string> {
    // 1. 이메일로 사용자 찾기
    const user = await this.usersService.findOneByEmail({ email });
    if (!user) {
      // 보안을 위해 사용자가 없어도 성공 메시지 반환 (이메일 열거 방지)
      return '비밀번호 재설정 링크가 전송되었습니다.';
    }

    // 2. 비밀번호 재설정 토큰 생성 (1시간 유효)
    const resetToken = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { secret: process.env.JWT_PASSWORD, expiresIn: '1h' },
    );

    // 3. Redis에 토큰 저장 (토큰:사용자ID 매핑, TTL: 1시간)
    const tokenKey = `passwordReset:${resetToken}`;
    await this.cacheManager.set(tokenKey, user.id, { ttl: 3600 }); // 1시간 = 3600초

    // 4. 비밀번호 재설정 링크 생성
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const resetLink = `${frontendUrl}/resetPassword?token=${resetToken}`;

    // 테스트용: 토큰 콘솔 출력
    console.log('===== 비밀번호 재설정 토큰 (테스트용) =====');
    console.log('토큰:', resetToken);
    console.log('재설정 링크:', resetLink);
    console.log('==========================================');

    // 이메일 전송 전에 로그 추가
    console.log('발신자 이메일:', process.env.RESEND_FROM_EMAIL);
    console.log('RESEND_API_KEY 설정 여부:', Boolean(process.env.RESEND_API_KEY));

    // 5. 이메일 전송 (Resend)
    try {
      const fromName = process.env.RESEND_FROM_NAME || 'ENS Intranet';
      const rawFromEmail = process.env.RESEND_FROM_EMAIL;
      const fromEmail = rawFromEmail?.endsWith('@mail.ensintranet.com')
        ? rawFromEmail.replace('@mail.ensintranet.com', '@ensintranet.com')
        : rawFromEmail;
      const replyTo = process.env.RESEND_REPLY_TO || fromEmail || undefined;

      if (rawFromEmail !== fromEmail) {
        this.logger.warn(
          `RESEND_FROM_EMAIL을 보정했습니다: ${rawFromEmail} -> ${fromEmail}`,
        );
      }

      if (!process.env.RESEND_API_KEY) {
        this.logger.error('RESEND_API_KEY가 설정되지 않았습니다.');
        return '비밀번호 재설정 링크가 전송되었습니다.';
      }

      if (!fromEmail) {
        this.logger.error('RESEND_FROM_EMAIL이 설정되지 않았습니다.');
        return '비밀번호 재설정 링크가 전송되었습니다.';
      }

      const { error } = await this.resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: user.email,
        replyTo: replyTo ? [replyTo] : undefined,
        subject: '비밀번호 재설정 요청',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">비밀번호 재설정</h2>
            <p>비밀번호 재설정을 요청하셨습니다. 아래 링크를 클릭하여 비밀번호를 재설정해주세요.</p>
            <p style="margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                비밀번호 재설정하기
              </a>
            </p>
          </div>
        `,
      });

      if (error) {
        this.logger.error(
          `Resend 메일 전송 실패 (userId=${user.id})`,
          JSON.stringify(error),
        );
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `비밀번호 재설정 메일 전송 실패 (userId=${user.id})`,
        err.stack ?? err.message,
      );
    }

    return '비밀번호 재설정 링크가 전송되었습니다.';
  }

  async resetPassword({ token, newPassword }: IAuthServiceResetPassword): Promise<string> {
    // 0. 비밀번호 형식 검증
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('8자리 이상의 대소문자, 숫자, 특수문자를 사용해 주세요.');
    }
    
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSpecialChar = /[@$!%*?&]/.test(newPassword);
    
    if (!hasLowerCase || !hasUpperCase || !hasNumber || !hasSpecialChar) {
      throw new BadRequestException('8자리 이상의 대소문자, 숫자, 특수문자를 사용해 주세요.');
    }

    // 1. 토큰 검증
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_PASSWORD);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.warn(`비밀번호 재설정 토큰 JWT 검증 실패: ${err.message}`);
      throw new BadRequestException('유효하지 않거나 만료된 토큰입니다.');
    }

    // 2. Redis에서 토큰 확인
    const tokenKey = `passwordReset:${token}`;
    const userIdInCache = await this.cacheManager.get(tokenKey);
    
    if (!userIdInCache) {
      throw new BadRequestException('유효하지 않거나 만료된 토큰입니다.');
    }

    // 3. 토큰의 사용자 ID와 Redis의 사용자 ID 일치 확인
    if (decoded.sub !== userIdInCache) {
      throw new BadRequestException('유효하지 않은 토큰입니다.');
    }

    // 4. 사용자 조회
    const user = await this.usersService.findOneById({ id: decoded.sub });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 5. 비밀번호 재설정 (토큰 기반, 기존 비밀번호 검증 없음)
    await this.usersService.updatePasswordByResetToken({
      userId: user.id,
      newPassword: newPassword,
    });

    // 7. Redis에서 토큰 삭제 (재사용 방지)
    await this.cacheManager.del(tokenKey);

    return '비밀번호가 성공적으로 재설정되었습니다.';
  }
}
