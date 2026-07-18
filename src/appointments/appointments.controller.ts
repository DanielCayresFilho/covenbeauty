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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CreateBlockDto } from './dto/create-block.dto';
import { CreateReturnDto } from './dto/create-return.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { QueryAppointmentsDto } from './dto/query-appointments.dto';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';

@ApiTags('appointments')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@UseGuards(RolesGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Post()
  @ApiOperation({ summary: '[ADMIN] Cria um atendimento (fim calculado pelas durações)' })
  create(@Body() dto: CreateAppointmentDto, @CurrentUser('id') userId: string) {
    return this.appointments.create(dto, userId);
  }

  @Post('block')
  @ApiOperation({ summary: '[ADMIN] Cria um bloqueio de agenda' })
  createBlock(@Body() dto: CreateBlockDto, @CurrentUser('id') userId: string) {
    return this.appointments.createBlock(dto, userId);
  }

  @Post(':id/return')
  @ApiOperation({ summary: '[ADMIN] Gera um retorno (reagenda procedimentos escolhidos)' })
  createReturn(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateReturnDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.appointments.createReturn(id, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: '[ADMIN] Lista agendamentos (filtros de agenda + paginação)' })
  findAll(@Query() query: QueryAppointmentsDto) {
    return this.appointments.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '[ADMIN] Detalha um agendamento' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.appointments.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '[ADMIN] Atualiza um agendamento (status, pagamento, horário...)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAppointmentDto) {
    return this.appointments.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '[ADMIN] Remove um agendamento' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.appointments.remove(id);
  }
}
