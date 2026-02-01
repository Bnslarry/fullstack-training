import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from "@shared/core";

@Controller()
export class AppController {
  @Get("health")
  health(): HealthResponse {
    return { status: 'ok', timestamp: Date.now() };
  }
}
