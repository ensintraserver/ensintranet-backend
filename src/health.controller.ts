// src/health.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('/healthz')
  healthz() {
    return { ok: true };
  }

  // HEAD / 도 종종 들어오니 루트도 열어두면 안전
  @Get('/')
  root() {
    return { ok: true };
  }
}
