import { Module } from '@nestjs/common';
import { SmsResolver } from './sms.resolver';
import { SmsService } from './sms.service';

@Module({
  providers: [SmsResolver, SmsService],
  exports: [SmsService],
})
export class SmsModule {}
