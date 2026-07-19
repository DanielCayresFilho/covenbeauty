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
import { AuthUser, CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';

@ApiTags('financial-accounts')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.STAFF)
@UseGuards(RolesGuard)
@Controller('financial/accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Post()
  @ApiOperation({ summary: 'Cria uma conta no plano de contas' })
  create(@Body() dto: CreateAccountDto, @CurrentUser('id') userId: string) {
    return this.accounts.create(dto, userId);
  }

  @Post('sync-procedures')
  @ApiOperation({ summary: 'Traz os procedimentos como contas de entrada' })
  syncProcedures(@CurrentUser() user: AuthUser) {
    return this.accounts.syncProcedures(user);
  }

  @Get()
  @ApiQuery({ name: 'category', enum: CashFlowCategory, required: false })
  @ApiOperation({ summary: 'Lista o plano de contas' })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('category') category?: CashFlowCategory,
  ) {
    return this.accounts.findAll(user, category);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha uma conta' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.accounts.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza uma conta (nome/ativa)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAccountDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.accounts.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove uma conta (se não tiver lançamentos)' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.accounts.remove(id, user);
  }
}
