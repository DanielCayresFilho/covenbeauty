import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ProcedureCategoriesService } from './procedure-categories.service';
import { CreateProcedureCategoryDto } from './dto/create-procedure-category.dto';
import { UpdateProcedureCategoryDto } from './dto/update-procedure-category.dto';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';

@ApiTags('procedure-categories')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@UseGuards(RolesGuard)
@Controller('procedure-categories')
export class ProcedureCategoriesController {
  constructor(private readonly categories: ProcedureCategoriesService) {}

  @Post()
  @ApiOperation({ summary: '[ADMIN] Cria uma categoria de procedimento' })
  create(@Body() dto: CreateProcedureCategoryDto) {
    return this.categories.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '[ADMIN] Lista categorias (com contagem de procedimentos)' })
  findAll() {
    return this.categories.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '[ADMIN] Detalha uma categoria de procedimento' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.categories.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '[ADMIN] Atualiza uma categoria de procedimento' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProcedureCategoryDto,
  ) {
    return this.categories.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '[ADMIN] Remove uma categoria (se não tiver procedimentos)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.categories.remove(id);
  }
}
