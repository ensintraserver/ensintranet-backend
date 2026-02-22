// auth-service.interface.ts

import { Response } from 'express';
import { User } from 'src/apis/users/entities/user.entity';
import { IAuthUser, IContext } from 'src/commons/interfaces/context';

export interface IAuthServiceLogin {
  email: string;
  password: string;
  context: IContext;
}

export interface IAuthServiceGetAccessToken {
  user: User | IAuthUser['user'];
  // [중요!!]
  // user: context.req.user에서 사용하는 user는 디비에서 꺼내온 유저가 아니라 액세스토큰 발급 과정에서 생성된 이름만 유저인 값이다 -> User테이블의 User타입을 쓰면 안된다
  // 대신에 context인터페이스에서 IAuthUser를 가져오면 validate함수에서 생성되는 형태와 똑같이 생긴 부분이 있음, 그 타입을 가져다 쓰면됨, IAuthUser['user']를 해주면 그 안에 있는 id만 나온다. 그걸 user: context.req.user에 적용해주도록 하는거다  -> 동일하게 RestoreAccessToken에서도 적용해주자
}

export interface IAuthServiceSetRefreshToken {
  user: User;
  context?: IContext;
  res?: Response;
}

export interface IAuthServiceRestoreAccessToken {
  user: User | IAuthUser['user'];
}

export interface JwtPayload {
  sub: string; // 사용자 id
  email?: string;
}
