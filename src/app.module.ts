import { CacheModule, Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { UsersModule } from './apis/users/users.module';

import * as redisStore from 'cache-manager-redis-store';
import { RedisClientOptions } from 'redis';
import { AuthModule } from './apis/auth/auth.module';
import { BoardModule } from './apis/board/board.module';
import { GqlAuthGuardGlobal } from './apis/auth/guards/gql-auth-global.guard';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthController } from './health.controller';
import { SmsModule } from './apis/sms/sms.module';

@Module({
  imports: [
    UsersModule,
    BoardModule,
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      persistedQueries: false,
      autoSchemaFile: 'src/commons/graphql/schema.gql',
      // Apollo Studio 비활성화 (개발 환경에서만)
      introspection: process.env.NODE_ENV === 'development', // introspection은 유지
      // Playground는 기본적으로 활성화되어 있지만, 추가 설정 가능
      plugins: [],
      context: ({ req, res }) => {
        // // 디버깅 로그 (GraphQL 요청만)
        // if (req.url === '/graphql' || req.url === '/') {
        //   console.log('===== GraphQL 요청 수신 =====');
        //   console.log('요청 URL:', req.url);
        //   console.log('원본 URL:', req.originalUrl);
        //   console.log('요청 Method:', req.method);
        //   console.log('Authorization:', req.headers.authorization ? '존재' : '없음');
        //   console.log('Cookie:', req.headers.cookie ? '존재' : '없음');

        //   // 프록시 관련 헤더 확인
        //   console.log('X-Forwarded-Path:', req.headers['x-forwarded-path'] || '없음');
        //   console.log('X-Forwarded-Uri:', req.headers['x-forwarded-uri'] || '없음');
        //   console.log('X-Forwarded-For:', req.headers['x-forwarded-for'] || '없음');
        //   console.log('X-Forwarded-Host:', req.headers['x-forwarded-host'] || '없음');
        //   console.log('X-Original-URL:', req.headers['x-original-url'] || '없음');

        //   // 응답 이벤트 리스너 추가
        //   res.on('finish', () => {
        //     console.log('===== GraphQL 응답 전송 =====');
        //     console.log('상태 코드:', res.statusCode);
        //     console.log('==============================');
        //   });

        //   console.log('==============================');
        // }
        return { req, res };
      },
      cors: {
        origin: [
          'http://localhost:3000', // 개발 환경
          'https://ensintranet.com', // 프로덕션 환경
        ],
        credentials: true,
        // 사파리 호환성을 위한 추가 옵션
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
        exposedHeaders: ['Set-Cookie'],
      },
      formatError: (error) => {
        console.log('에러 받았다~');
        console.log(error);
        return error;
      }, // 아폴로 에러를 받을 일이 없는경우에는 formatError는 없애줘도 된다
    }),
    TypeOrmModule.forRoot({
      type: process.env.DATABASE_TYPE as 'postgres',
      host: process.env.DATABASE_HOST,
      port: Number(process.env.DATABASE_PORT),
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,

      database: process.env.DATABASE_DATABASE,

      entities: [__dirname + '/apis/**/*.entity.*'],
      synchronize: process.env.NODE_ENV !== 'production', // 개발/테스트에서만 true
      logging:
        process.env.NODE_ENV === 'development'
          ? true // 개발: 모든 쿼리 로그
          : ['error'], // 프로덕션: 에러만 로그
    }),
    // CacheModule.registerAsync({ isGlobal: true, useClass: CacheConfigService }), // 여기서 isGlobal: true를 설정해주면, 전역에서 캐시를 사용할 수 있게 된다!
    // Upstash Redis 연결 설정 (Redis 프로토콜 사용)
    CacheModule.registerAsync<RedisClientOptions>({
      isGlobal: true,
      useFactory: () => {
        const redisUrl = process.env.REDIS_URL;

        if (!redisUrl) {
          console.warn(
            '⚠️ REDIS_URL이 설정되지 않았습니다. 메모리 캐시를 사용합니다.',
          );
          return {
            ttl: 300,
            max: 100,
          };
        }

        // 로컬 Redis (docker-compose) 사용 시
        if (redisUrl.startsWith('redis://')) {
          return {
            store: redisStore as unknown as any,
            url: redisUrl, // redis://ens-redis:6379 또는 redis://localhost:6379
          };
        }

        // Upstash Redis (TLS 사용)인 경우
        return {
          store: redisStore as unknown as any, // 타입 단언
          url: redisUrl, // rediss://default:password@endpoint:port 형식

          // 연결 옵션
          socket: {
            // TLS 설정 (Upstash는 TLS 필수)
            tls: true,
            rejectUnauthorized: false, // Upstash 인증서 자동 검증
          },
          // 재시도 설정
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          maxRetriesPerRequest: 3,
          // 연결 실패 시에도 앱이 계속 실행되도록
          enableReadyCheck: false,
        };
      },
    }),
    AuthModule,
    SmsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: GqlAuthGuardGlobal, // 전역 Guard 등록
    },
  ],
})
export class AppModule {}
