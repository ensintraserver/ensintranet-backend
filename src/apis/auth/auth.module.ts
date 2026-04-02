// auth.module.ts

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { UsersModule } from '../users/users.module';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
// import { GqlAuthGuard } from './guards/gql-auth.guard';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

function buildMailTransport() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const smtpHost = (process.env.SMTP_HOST || '').toLowerCase();

  // Google 계정 Gmail SMTP
  const useGmail =
    process.env.SMTP_TRANSPORT === 'gmail' || smtpHost.includes('smtp.gmail.com');

  if (useGmail) {
    return {
      service: 'gmail',
      auth: { user, pass },
    };
  }

  // 일반 SMTP (SendGrid 등)
  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: { user, pass },
  };
}



@Module({
  imports: [
    JwtModule.register({}), //
    UsersModule,
    ConfigModule,
    MailerModule.forRoot({
      transport: buildMailTransport(),
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
