import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Public } from 'src/commons/decorators/public.decorator';
import { SmsService } from './sms.service';

@Resolver()
export class SmsResolver {
  constructor(private readonly smsService: SmsService) {}

  @Public()
  @Mutation(() => String)
  async sendHelloSms(@Args('phone') phone: string): Promise<string> {
    return this.smsService.sendHelloMessage(phone);
  }
}
