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
import { ProceduresService } from './procedures.service';
import { CreateProcedureDto } from './dto/create-procedure.dto';
import { UpdateProcedureDto } from './dto/update-procedure.dto';
import { QueryProceduresDto } from './dto/query-procedures.dto';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';

@ApiTags('procedures')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@UseGuards(RolesGuard)
@Controller('procedures')
export class ProceduresController {
  constructor(private readonly procedures: ProceduresService) {}

  @Post()
  @ApiOperation({ summary: '[ADMIN] Cadastra um procedimento' })
  create(@Body() dto: CreateProcedureDto) {
    return this.procedures.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '[ADMIN] Lista procedimentos (busca, filtro, paginação)' })
  findAll(@Query() query: QueryProceduresDto) {
    return this.procedures.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '[ADMIN] Detalha um procedimento' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.procedures.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '[ADMIN] Atualiza um procedimento' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProcedureDto) {
    return this.procedures.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '[ADMIN] Remove um procedimento' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.procedures.remove(id);
  }
}
