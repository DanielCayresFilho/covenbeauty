import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { RemindersService } from './reminders.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { QueryRemindersDto } from './dto/query-reminders.dto';
import { GenerateBirthdaysDto } from './dto/generate-birthdays.dto';
import { AuthUser, CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';

@ApiTags('reminders')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.STAFF)
@UseGuards(RolesGuard)
@Controller('reminders')
export class RemindersController {
  constructor(private readonly reminders: RemindersService) {}

  @Post()
  @ApiOperation({ summary: 'Cria um lembrete' })
  create(@Body() dto: CreateReminderDto, @CurrentUser('id') userId: string) {
    return this.reminders.create(dto, userId);
  }

  @Post('generate-birthdays')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gera lembretes de aniversário dos clientes do mês' })
  generateBirthdays(@Body() dto: GenerateBirthdaysDto) {
    return this.reminders.generateBirthdays(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista lembretes (status: pending/completed/overdue)' })
  findAll(@Query() query: QueryRemindersDto, @CurrentUser() user: AuthUser) {
    return this.reminders.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um lembrete' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.reminders.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um lembrete' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReminderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reminders.update(id, dto, user);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marca o lembrete como concluído' })
  complete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.reminders.complete(id, user);
  }

  @Post(':id/reopen')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reabre um lembrete concluído' })
  reopen(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.reminders.reopen(id, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove um lembrete' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.reminders.remove(id, user);
  }
}
