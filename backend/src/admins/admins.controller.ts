import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminsService } from './admins.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('super_admin', 'admin')
@Controller('admins')
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createAdmin(
    @Body()
    dto: {
      fullName: string;
      email: string;
      password: string;
      phone?: string;
      roleName: string;
    },
  ) {
    return this.adminsService.createAdmin(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAllAdmins(
    @Query()
    query: {
      page?: number;
      limit?: number;
      search?: string;
      role?: string;
    },
  ) {
    return this.adminsService.findAllAdmins(query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findAdminById(@Param('id') id: string) {
    return this.adminsService.findAdminById(id);
  }

  @Patch(':id/role')
  @HttpCode(HttpStatus.OK)
  async updateAdminRole(
    @Param('id') id: string,
    @Body() dto: { roleName: string },
  ) {
    return this.adminsService.updateAdminRole(id, dto.roleName);
  }

  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivateAdmin(@Param('id') id: string) {
    return this.adminsService.deactivateAdmin(id);
  }
}
