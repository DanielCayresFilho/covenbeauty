import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { AnalyticsPeriodQuery } from './dto/analytics-period.query';
import { TopClientsQuery } from './dto/top-clients.query';
import { AnalyticsYearQuery } from './dto/analytics-year.query';
import { AuthUser, CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';

@ApiTags('analytics')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.STAFF)
@UseGuards(RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('summary')
  @ApiOperation({
    summary:
      'Resumo do período (padrão mês): clientes novos, atendimentos, retornos, faturamento',
  })
  summary(@Query() query: AnalyticsPeriodQuery, @CurrentUser() user: AuthUser) {
    return this.analytics.summary(query, user);
  }

  @Get('top-clients')
  @ApiOperation({ summary: 'Clientes que mais gastaram (padrão ano)' })
  topClients(@Query() query: TopClientsQuery, @CurrentUser() user: AuthUser) {
    return this.analytics.topClients(query, user);
  }

  @Get('overview')
  @ApiOperation({
    summary:
      'Métricas do ano: rankings de clientes, desempenho mensal e procedimentos mais feitos',
  })
  overview(@Query() query: AnalyticsYearQuery, @CurrentUser() user: AuthUser) {
    return this.analytics.overview(query, user);
  }
}
