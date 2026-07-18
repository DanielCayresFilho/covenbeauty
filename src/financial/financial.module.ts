import { Module } from '@nestjs/common';
import { AccountsService } from './accounts/accounts.service';
import { AccountsController } from './accounts/accounts.controller';
import { EntriesService } from './entries/entries.service';
import { EntriesController } from './entries/entries.controller';
import { GoalsService } from './goals/goals.service';
import { GoalsController } from './goals/goals.controller';
import { ReportsService } from './reports/reports.service';
import { ReportsController } from './reports/reports.controller';

@Module({
  controllers: [
    AccountsController,
    EntriesController,
    GoalsController,
    ReportsController,
  ],
  providers: [AccountsService, EntriesService, GoalsService, ReportsService],
})
export class FinancialModule {}
