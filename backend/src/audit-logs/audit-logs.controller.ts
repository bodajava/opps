import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuditLogsService } from './audit-logs.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('super_admin', 'admin')
@Controller('admin/audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: QueryAuditLogsDto) {
    return this.auditLogsService.findAll(query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string) {
    return this.auditLogsService.findById(id);
  }

  @Get('entity/:entity/:entityId')
  @HttpCode(HttpStatus.OK)
  async getByEntity(
    @Param('entity') entity: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditLogsService.getByEntity(entity, entityId);
  }
}
