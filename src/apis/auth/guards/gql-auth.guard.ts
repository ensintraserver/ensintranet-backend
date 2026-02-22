// gql-auth.guard.ts

import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';

// export class GqlAuthAccessGuard extends AuthGuard('access') {
//   getRequest(context: ExecutionContext) {
//     const gqlContext = GqlExecutionContext.create(context);
//     return gqlContext.getContext().req;
//   }
// }

// 위 같은 인가 함수를 리프레시토큰용으로 하나 만들어준다
// 근데 아래처럼 만들면 액세스와 리프레시가 이름만 다르고 가드함수가 똑같이 생김 -> 그래서 맨 위에서 함수를 통합해주고 인자로 받아오도록 만든다다
// export class GqlAuthRefreshGuard extends AuthGuard('refresh') {
//   getRequest(context: ExecutionContext) {
//     const gqlContext = GqlExecutionContext.create(context);
//     return gqlContext.getContext().req;
//   }
// }

// 이 함수를 실행하고 인자에 어떤 이름을 할지를 만들어주면 GqlAuthAccessGuard라는 클래스가 실행된다
export const GqlAuthGuard = (name) => {
  return class GqlAuthGuard extends AuthGuard(name) {
    getRequest(context: ExecutionContext) {
      const gqlContext = GqlExecutionContext.create(context);
      return gqlContext.getContext().req;
    }
  };
};
