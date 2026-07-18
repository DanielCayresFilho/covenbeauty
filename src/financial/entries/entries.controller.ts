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
import { EntriesService } from './entries.service';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { QueryEntriesDto } from './dto/query-entries.dto';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';

@ApiTags('financial-entries')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@UseGuards(RolesGuard)
@Controller('financial/entries')
export class EntriesController {
  constructor(private readonly entries: EntriesService) {}

  @Post()
  @ApiOperation({ summary: '[ADMIN] Cria um lançamento (entrada, saída ou movimentação)' })
  create(@Body() dto: CreateEntryDto, @CurrentUser('id') userId: string) {
    return this.entries.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: '[ADMIN] Lista lançamentos (filtros + paginação)' })
  findAll(@Query() query: QueryEntriesDto) {
    return this.entries.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '[ADMIN] Detalha um lançamento' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.entries.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '[ADMIN] Atualiza um lançamento (data/valor/descrição)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEntryDto) {
    return this.entries.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '[ADMIN] Remove um lançamento' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.entries.remove(id);
  }
}
