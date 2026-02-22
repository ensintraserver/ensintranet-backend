import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { CustomExceptionFilter } from './commons/filter/custom-exception.filter';
import { graphqlUploadExpress } from 'graphql-upload';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // CORS 설정 추가
  app.enableCors({
    origin: [
      'http://localhost:3000', // 개발 환경
      'https://guardrail-fawn.vercel.app', // 프로덕션 환경
    ], // 프론트엔드 주소
    credentials: true, // credentials 허용
  });
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalFilters(new CustomExceptionFilter());
  app.use(graphqlUploadExpress());
  // Render는 PORT 환경 변수를 제공합니다
  const port = process.env.PORT || 3001;
  await app.listen(port as any, '0.0.0.0');
}
bootstrap();
