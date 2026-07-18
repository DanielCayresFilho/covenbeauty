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
import { CashFlowCategory, Role } from '@prisma/client';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';

@ApiTags('financial-accounts')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@UseGuards(RolesGuard)
@Controller('financial/accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Post()
  @ApiOperation({ summary: '[ADMIN] Cria uma conta no plano de contas' })
  create(@Body() dto: CreateAccountDto) {
    return this.accounts.create(dto);
  }

  @Post('sync-procedures')
  @ApiOperation({ summary: '[ADMIN] Traz os procedimentos como contas de entrada' })
  syncProcedures() {
    return this.accounts.syncProcedures();
  }

  @Get()
  @ApiQuery({ name: 'category', enum: CashFlowCategory, required: false })
  @ApiOperation({ summary: '[ADMIN] Lista o plano de contas' })
  findAll(@Query('category') category?: CashFlowCategory) {
    return this.accounts.findAll(category);
  }

  @Get(':id')
  @ApiOperation({ summary: '[ADMIN] Detalha uma conta' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.accounts.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '[ADMIN] Atualiza uma conta (nome/ativa)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAccountDto) {
    return this.accounts.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '[ADMIN] Remove uma conta (se não tiver lançamentos)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.accounts.remove(id);
  }
}
