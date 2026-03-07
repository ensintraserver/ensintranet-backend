// auth.module.ts

import { CacheModule, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { UsersModule } from '../users/users.module';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
// import { GqlAuthGuard } from './guards/gql-auth.guard';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';



@Module({
  imports: [
    JwtModule.register({}), //
    UsersModule,
    ConfigModule,
    MailerModule.forRoot({
      transport: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      },
      defaults: {
        from: `"${process.env.SMTP_FROM_NAME || 'ENS Intranet'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        replyTo: process.env.SMTP_REPLY_TO || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
      },
    }),
    // CacheModule,
  ],
  providers: [
    JwtAccessStrategy, // 여기서 주입하면 전역에서 사용가능
    JwtRefreshStrategy,

    AuthResolver, //
    AuthService,
  ],
  exports: [AuthService],

})
export class AuthModule {}
