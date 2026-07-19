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
import { AuthUser, CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';

@ApiTags('financial-entries')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.STAFF)
@UseGuards(RolesGuard)
@Controller('financial/entries')
export class EntriesController {
  constructor(private readonly entries: EntriesService) {}

  @Post()
  @ApiOperation({ summary: 'Cria um lançamento (entrada, saída ou movimentação)' })
  create(@Body() dto: CreateEntryDto, @CurrentUser() user: AuthUser) {
    return this.entries.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Lista lançamentos (filtros + paginação)' })
  findAll(@Query() query: QueryEntriesDto, @CurrentUser() user: AuthUser) {
    return this.entries.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um lançamento' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.entries.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um lançamento (data/valor/descrição)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEntryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.entries.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove um lançamento' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.entries.remove(id, user);
  }
}
