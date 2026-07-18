import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env.validation';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { MailModule } from './mail/mail.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { ProcedureCategoriesModule } from './procedure-categories/procedure-categories.module';
import { ProceduresModule } from './procedures/procedures.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { ComandasModule } from './comandas/comandas.module';
import { FinancialModule } from './financial/financial.module';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { RemindersModule } from './reminders/reminders.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    // Rate limiting em duas camadas: burst (por segundo) + sustentado (por minuto).
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'burst', ttl: 1_000, limit: 10 },
        { name: 'default', ttl: 60_000, limit: 100 },
      ],
    }),
    PrismaModule,
    QueueModule,
    MailModule,
    UsersModule,
    ClientsModule,
    CategoriesModule,
    ProductsModule,
    ProcedureCategoriesModule,
    ProceduresModule,
    AppointmentsModule,
    ComandasModule,
    FinancialModule,
    EvaluationsModule,
    RemindersModule,
    AnalyticsModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    // Autenticação obrigatória por padrão — use @Public() para abrir rotas.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Traduz erros do Prisma sem vazar detalhes internos.
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}
