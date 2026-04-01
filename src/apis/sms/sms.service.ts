import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
const { config, msg } = require('solapi');

@Injectable()
export class SmsService {
  constructor() {
    const apiKey = process.env.SOLAPI_API_KEY;
    const apiSecret = process.env.SOLAPI_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error('SOLAPI_API_KEY 또는 SOLAPI_API_SECRET 환경변수가 설정되지 않았습니다.');
    }
    config.init({ apiKey, apiSecret });
  }

  async sendHelloMessage(phone: string): Promise<string> {
    const from = process.env.SOLAPI_SENDER;
    if (!from) {
      throw new InternalServerErrorException('SOLAPI_SENDER 환경변수가 설정되지 않았습니다.');
    }

    const to = this.normalizePhone(phone);
    if (!to) {
      throw new BadRequestException('유효한 전화번호를 입력해주세요.');
    }

    try {
      await msg.send({
        messages: [
          {
            to,
            from,
            text: '안녕하세요',
          },
        ],
      });
      return '문자 발송이 완료되었습니다.';
    } catch (error) {
      console.error('Solapi 문자 발송 실패:', error);
      throw new InternalServerErrorException('문자 발송에 실패했습니다.');
    }
  }

  private normalizePhone(phone: string): string {
    return (phone || '').replace(/\D/g, '');
  }
}
