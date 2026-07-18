import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ReportsService } from './reports.service';
import { IncomeReportQuery } from './dto/income-report.query';
import { CashFlowQuery } from './dto/cash-flow.query';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';

@ApiTags('financial-reports')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@UseGuards(RolesGuard)
@Controller('financial/reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('income')
  @ApiOperation({ summary: '[ADMIN] Entradas por dia/semana/mês' })
  income(@Query() query: IncomeReportQuery) {
    return this.reports.incomeByPeriod(query);
  }

  @Get('summary')
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiOperation({ summary: '[ADMIN] Resumo do período (entradas, saídas, lucro)' })
  summary(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reports.summary(from, to);
  }

  @Get('cash-flow')
  @ApiOperation({ summary: '[ADMIN] Fluxo de caixa mensal do ano' })
  cashFlow(@Query() query: CashFlowQuery) {
    return this.reports.cashFlow(query);
  }
}
