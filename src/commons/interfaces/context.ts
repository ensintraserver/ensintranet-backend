import { Request, Response } from 'express';
import { User } from 'src/apis/users/entities/user.entity';

export interface IAuthUser {
  id: string;
}

export interface IContext {
  req?: Request & { user: IAuthUser }; // JwtAccessStrategy에서 return값을 보내줄때 req.user에 { id: string } 형태로 저장되므로 user 속성으로 정의

  res: Response;
}

export interface IContextForFetch {
  req: Request & { user: User };

  res: Response;
}
