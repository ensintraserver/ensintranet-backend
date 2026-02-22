import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import {
  IAuthServiceGetAccessToken,
  IAuthServiceLogin,
  IAuthServiceRestoreAccessToken,
  IAuthServiceSetRefreshToken,
  // IAuthServiceRestoreAccessToken,
  // IAuthServiceSetRefreshToken,
} from './interfaces/auth-service.interfaces';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,

    private readonly usersService: UsersService,
  ) {}

  async login({
    email,
    password,
    context,
  }: // context,
  IAuthServiceLogin): Promise<string> {
    // 1. 이메일이 일치하는 유저를 DB에서 찾기
    const user = await this.usersService.findOneByEmail({ email });

    // 2. 일치하는 유저가 없으면?! 에러 던지기!!!
    if (!user) throw new UnprocessableEntityException('이메일이 없습니다.');

    // 3. 일치하는 유저가 있지만, 비밀번호가 틀렸다면?!
    const isAuth = await bcrypt.compare(password, user.password);
    if (!isAuth) throw new UnprocessableEntityException('암호가 틀렸습니다.');

    // 4. refreshToken(=JWT)을 만들어서 브라우저 쿠키에 저장해서 보내주기
    this.setRefreshToken({ user, context });

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

  //   // context.res.setHeader(
  //   //   'set-Cookie',
  //   //   `refreshToken=${refreshToken}; path=/;`,
  //   // );

  //   // 개발환경 설정 (localhost 간 통신)
  //   context.res.setHeader(
  //     'set-Cookie',
  //     `refreshToken=${refreshToken}; path=/; HttpOnly; SameSite=Lax; Max-Age=1209600`,
  //   );

  //   // [배포환경에서는 아래와 같이 작성하자]
  //   // domain은 내가 배포할 사이트 주소(앞에 점.을 꼭 붙여줘야한다), 주소가 틀리면 쿠키를 전달 안하게 만들 수 있다
  //   // context.res.setHeader('set-Cookie', `refreshToken=${refreshToken}; path=/; domain=.mybacksite.com; SameSite=None; Secure; httpOnly`);
  //   // 누가 사용가능한지 명확하게 지정해주는 부분 -> 뒤쪽에 프론트엔드(브라우저) 주소를 작성해준다
  //   // context.res.setHeader('Access-Control-Allow-Origin', 'https://myfrontsite.com');
  // }
  setRefreshToken({ user, context }: IAuthServiceSetRefreshToken): void {
    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      { secret: process.env.JWT_REFRESH_PASSWORD, expiresIn: '2w' },
    );

    const isProduction = process.env.NODE_ENV === 'production';

    // 2주 = 14일 = 1209600초
    const maxAge = 1209600;
    const expiresDate = new Date(Date.now() + maxAge * 1000);
    const expiresString = expiresDate.toUTCString();

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

    if (isProduction) {
      // 배포 환경: 프록시 사용 시 같은 도메인이므로 SameSite=Lax 사용 (사파리 호환성 향상)
      cookieString = `refreshToken=${encodedToken}; Path=/; Expires=${expiresString}; Max-Age=${maxAge}; Secure; HttpOnly; SameSite=Lax`;
    } else {
      const req = context.req || (context as any).request;
      const isSecure =
        req?.secure ||
        req?.headers?.['x-forwarded-proto'] === 'https' ||
        req?.protocol === 'https';

      if (isSecure) {
        // 개발 환경 HTTPS: SameSite=Lax 사용
        cookieString = `refreshToken=${encodedToken}; Path=/; Expires=${expiresString}; Max-Age=${maxAge}; Secure; HttpOnly; SameSite=Lax`;
      } else {
        // 개발 환경 HTTP: SameSite=Lax 사용
        cookieString = `refreshToken=${encodedToken}; Path=/; Expires=${expiresString}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`;
      }
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

      // 헤더 설정
      context.res.setHeader('Set-Cookie', cookieString);

      // setHeader 직후 헤더 확인
      const afterHeader = context.res.getHeader('Set-Cookie');
      console.log('setHeader 직후 헤더:', afterHeader);
      console.log('✅ 쿠키 설정 완료');
      console.log('✅ 쿠키 문자열 길이:', cookieString.length);
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
              const retryCookieString = cookieString.replace(
                refreshToken,
                encodedToken,
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
}
