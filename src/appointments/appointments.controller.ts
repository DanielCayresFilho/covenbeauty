import type { Response } from 'express';
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
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AppointmentsService } from './appointments.service';
import { DecalqueService } from './decalque.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CreateBlockDto } from './dto/create-block.dto';
import { CreateReturnDto } from './dto/create-return.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { QueryAppointmentsDto } from './dto/query-appointments.dto';
import { MAX_UPLOAD_BYTES, type UploadedImage } from '@/common/uploads';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';

@ApiTags('appointments')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.STAFF)
@UseGuards(RolesGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly appointments: AppointmentsService,
    private readonly decalque: DecalqueService,
  ) {}

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

  // ─────────────── Decalque (stencil) da tatuagem ───────────────

  @Post(':id/decalque')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Anexa/atualiza o decalque da tatuagem' })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  uploadDecalque(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: UploadedImage | undefined,
  ) {
    return this.decalque.upload(id, file);
  }

  @Get(':id/decalque/file')
  @ApiOperation({ summary: 'Baixa o decalque (autenticado)' })
  async decalqueFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { path, mimeType } = await this.decalque.fileOf(id);
    res.type(mimeType);
    res.sendFile(path);
  }

  @Delete(':id/decalque')
  @ApiOperation({ summary: 'Remove o decalque da tatuagem' })
  removeDecalque(@Param('id', ParseUUIDPipe) id: string) {
    return this.decalque.remove(id);
  }
}
