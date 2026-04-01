// src/health.controller.ts
import { Controller, Get, HttpCode } from '@nestjs/common';

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

  // Service Worker 파일 요청이 백엔드로 들어오면 204로 빠르게 응답
  @Get('/sw.js')
  @HttpCode(204)
  sw() {
    return;
  }
}
