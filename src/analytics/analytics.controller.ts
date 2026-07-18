import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { AnalyticsPeriodQuery } from './dto/analytics-period.query';
import { TopClientsQuery } from './dto/top-clients.query';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';

@ApiTags('analytics')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@UseGuards(RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('summary')
  @ApiOperation({
    summary:
      '[ADMIN] Resumo do período (padrão mês): clientes novos, atendimentos, retornos, faturamento',
  })
  summary(@Query() query: AnalyticsPeriodQuery) {
    return this.analytics.summary(query);
  }

  @Get('top-clients')
  @ApiOperation({ summary: '[ADMIN] Clientes que mais gastaram (padrão ano)' })
  topClients(@Query() query: TopClientsQuery) {
    return this.analytics.topClients(query);
  }
}
