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
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientsDto } from './dto/query-clients.dto';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';

@ApiTags('clients')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@UseGuards(RolesGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Post()
  @ApiOperation({ summary: '[ADMIN] Cadastra um novo cliente do salão' })
  create(@Body() dto: CreateClientDto, @CurrentUser('id') adminId: string) {
    return this.clients.create(dto, adminId);
  }

  @Get()
  @ApiOperation({ summary: '[ADMIN] Lista clientes (busca + paginação)' })
  findAll(@Query() query: QueryClientsDto) {
    return this.clients.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '[ADMIN] Detalha um cliente' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.clients.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '[ADMIN] Atualiza um cliente' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateClientDto) {
    return this.clients.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '[ADMIN] Remove um cliente' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.clients.remove(id);
  }
}
