import { Module } from '@nestjs/common';
import { AccountsService } from './accounts/accounts.service';
import { AccountsController } from './accounts/accounts.controller';
import { EntriesService } from './entries/entries.service';
import { EntriesController } from './entries/entries.controller';
import { GoalsService } from './goals/goals.service';
import { GoalsController } from './goals/goals.controller';
import { ReportsService } from './reports/reports.service';
import { ReportsController } from './reports/reports.controller';
import { FixedExpensesService } from './fixed-expenses/fixed-expenses.service';
import { FixedExpensesController } from './fixed-expenses/fixed-expenses.controller';
import { ComandaFinancialService } from './sync/comanda-financial.service';

@Module({
  controllers: [
    AccountsController,
    EntriesController,
    GoalsController,
    ReportsController,
    FixedExpensesController,
  ],
  providers: [
    AccountsService,
    EntriesService,
    GoalsService,
    ReportsService,
    FixedExpensesService,
    ComandaFinancialService,
  ],
  // As comandas alimentam o fluxo de caixa ao fechar.
  exports: [ComandaFinancialService],
})
export class FinancialModule {}
