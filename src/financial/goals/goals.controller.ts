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
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { AuthUser, CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';

@ApiTags('financial-goals')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.STAFF)
@UseGuards(RolesGuard)
@Controller('financial/goals')
export class GoalsController {
  constructor(private readonly goals: GoalsService) {}

  @Post()
  @ApiOperation({ summary: 'Cria uma meta de entradas por período' })
  create(@Body() dto: CreateGoalDto, @CurrentUser('id') userId: string) {
    return this.goals.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Lista metas (com progresso)' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.goals.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha uma meta (com progresso)' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.goals.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza uma meta' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGoalDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.goals.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove uma meta' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.goals.remove(id, user);
  }
}
