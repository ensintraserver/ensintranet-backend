import { Request, Response } from 'express';
import { User } from 'src/apis/users/entities/user.entity';

export interface IAuthUser {
  user?: {
    id: string;
  };
}

export interface IContext {
  req?: Request & IAuthUser; // JwtAccessStrategy에서 return값을 보내줄때 req안에 user값을 같이 넣어서 보내줬으니까 IAuthUser라는 타입도 만들어준다

  res: Response;
}

export interface IContextForFetch {
  req: Request & { user: User };

  res: Response;
}
