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
import { AuthUser, CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';

@ApiTags('procedures')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.STAFF)
@UseGuards(RolesGuard)
@Controller('procedures')
export class ProceduresController {
  constructor(private readonly procedures: ProceduresService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastra um procedimento' })
  create(@Body() dto: CreateProcedureDto, @CurrentUser('id') userId: string) {
    return this.procedures.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Lista procedimentos (busca, filtro, paginação)' })
  findAll(@Query() query: QueryProceduresDto, @CurrentUser() user: AuthUser) {
    return this.procedures.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um procedimento' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.procedures.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um procedimento' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProcedureDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.procedures.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove um procedimento' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.procedures.remove(id, user);
  }
}
