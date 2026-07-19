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
import { EvaluationsService } from './evaluations.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto';
import { QueryEvaluationsDto } from './dto/query-evaluations.dto';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';

@ApiTags('evaluations')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.STAFF)
@UseGuards(RolesGuard)
@Controller('evaluations')
export class EvaluationsController {
  constructor(private readonly evaluations: EvaluationsService) {}

  @Post()
  @ApiOperation({ summary: '[ADMIN] Cria uma ficha de avaliação para o cliente' })
  create(@Body() dto: CreateEvaluationDto, @CurrentUser('id') userId: string) {
    return this.evaluations.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: '[ADMIN] Lista fichas (filtra por cliente; histórico)' })
  findAll(@Query() query: QueryEvaluationsDto) {
    return this.evaluations.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '[ADMIN] Detalha uma ficha de avaliação' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.evaluations.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '[ADMIN] Atualiza uma ficha de avaliação' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEvaluationDto) {
    return this.evaluations.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '[ADMIN] Remove uma ficha de avaliação' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.evaluations.remove(id);
  }
}
