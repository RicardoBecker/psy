import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../../common/types/auth.types';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  // 📋 Listar usuários com filtros e paginação
  @Get()
  async getUsers(@Query(ValidationPipe) query: GetUsersQueryDto) {
    return this.adminUsersService.getUsers(query);
  }

  // 📊 Estatísticas de usuários
  @Get('stats')
  async getUserStats() {
    return this.adminUsersService.getUserStats();
  }

  // 👤 Obter usuário específico
  @Get(':id')
  async getUserById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminUsersService.getUserById(id);
  }

  // ➕ Criar usuário (admin)
  @Post()
  async createUser(@Body(ValidationPipe) createUserDto: CreateAdminUserDto) {
    return this.adminUsersService.createUser(createUserDto);
  }

  // ✏️ Atualizar usuário
  @Patch(':id')
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateUserDto: UpdateAdminUserDto,
  ) {
    return this.adminUsersService.updateUser(id, updateUserDto);
  }

  // 🔄 Alterar role do usuário
  @Patch(':id/role')
  async updateUserRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateRoleDto: UpdateUserRoleDto,
    @Request() req,
  ) {
    return this.adminUsersService.updateUserRole(id, updateRoleDto, req.user.id);
  }

  // 🔛 Alterar status do usuário
  @Patch(':id/status')
  async updateUserStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateStatusDto: UpdateUserStatusDto,
    @Request() req,
  ) {
    return this.adminUsersService.updateUserStatus(id, updateStatusDto, req.user.id);
  }
}