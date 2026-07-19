import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ReportsService } from './reports.service';
import { IncomeReportQuery } from './dto/income-report.query';
import { CashFlowQuery } from './dto/cash-flow.query';
import { SetOpeningDto } from './dto/set-opening.dto';
import { AuthUser, CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';

@ApiTags('financial-reports')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.STAFF)
@UseGuards(RolesGuard)
@Controller('financial/reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('income')
  @ApiOperation({ summary: 'Entradas por dia/semana/mês' })
  income(@Query() query: IncomeReportQuery, @CurrentUser() user: AuthUser) {
    return this.reports.incomeByPeriod(query, user);
  }

  @Get('summary')
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiOperation({ summary: 'Resumo do período (entradas, saídas, lucro)' })
  summary(
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reports.summary(user, from, to);
  }

  @Get('cash-flow')
  @ApiOperation({ summary: 'Fluxo de caixa mensal do ano' })
  cashFlow(@Query() query: CashFlowQuery, @CurrentUser() user: AuthUser) {
    return this.reports.cashFlow(query, user);
  }

  @Put('cash-flow/opening')
  @ApiOperation({ summary: 'Define/limpa o saldo inicial de um mês (manual)' })
  setOpening(@Body() dto: SetOpeningDto, @CurrentUser() user: AuthUser) {
    return this.reports.setOpening(user, dto);
  }
}
