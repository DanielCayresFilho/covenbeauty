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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';

@ApiTags('categories')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.STAFF)
@UseGuards(RolesGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: '[ADMIN] Cria uma categoria de produtos' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categories.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '[ADMIN] Lista categorias (com contagem de produtos)' })
  findAll() {
    return this.categories.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '[ADMIN] Detalha uma categoria' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.categories.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '[ADMIN] Atualiza uma categoria' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto) {
    return this.categories.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '[ADMIN] Remove uma categoria (se não tiver produtos)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.categories.remove(id);
  }
}
