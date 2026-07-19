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
import { AuthUser, CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';

@ApiTags('clients')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.STAFF)
@UseGuards(RolesGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastra um novo cliente do salão' })
  create(@Body() dto: CreateClientDto, @CurrentUser() user: AuthUser) {
    return this.clients.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Lista clientes (busca + paginação)' })
  findAll(@Query() query: QueryClientsDto, @CurrentUser() user: AuthUser) {
    return this.clients.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um cliente' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.clients.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um cliente' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.clients.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove um cliente' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.clients.remove(id, user);
  }
}
