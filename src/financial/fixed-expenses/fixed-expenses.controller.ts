import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { FixedExpensesService } from './fixed-expenses.service';
import { CreateFixedExpenseDto } from './dto/create-fixed-expense.dto';
import { UpdateFixedExpenseDto } from './dto/update-fixed-expense.dto';
import { PayFixedExpenseDto } from './dto/pay-fixed-expense.dto';
import { AuthUser, CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';

@ApiTags('financial-fixed-expenses')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.STAFF)
@UseGuards(RolesGuard)
@Controller('financial/fixed-expenses')
export class FixedExpensesController {
  constructor(private readonly expenses: FixedExpensesService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastra uma despesa fixa mensal' })
  create(@Body() dto: CreateFixedExpenseDto, @CurrentUser() user: AuthUser) {
    return this.expenses.create(dto, user);
  }

  @Get()
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiOperation({ summary: 'Lista as despesas fixas com vencimento e situação' })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.expenses.findAll(user, includeInactive === 'true');
  }

  @Get('upcoming')
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiOperation({ summary: 'Despesas a vencer nos próximos dias (padrão 15)' })
  upcoming(@CurrentUser() user: AuthUser, @Query('days') days?: string) {
    const parsed = Number(days);
    return this.expenses.upcoming(
      user,
      Number.isFinite(parsed) && parsed > 0 ? parsed : 15,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha uma despesa fixa' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.expenses.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza uma despesa fixa' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFixedExpenseDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.expenses.update(id, dto, user);
  }

  @Post(':id/pay')
  @ApiOperation({ summary: 'Paga a despesa e lança a saída no fluxo de caixa' })
  pay(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PayFixedExpenseDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.expenses.pay(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desativa a despesa fixa (mantém o histórico)' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.expenses.remove(id, user);
  }
}
