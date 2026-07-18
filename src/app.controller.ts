import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './auth/decorators/public.decorator';

@ApiTags('health')
@Controller()
export class AppController {
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Healthcheck da API' })
  health() {
    return { status: 'ok', service: 'coven-beauty', timestamp: new Date().toISOString() };
  }
}
