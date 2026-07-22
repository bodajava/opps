import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CampaignsService } from './campaigns.service';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('super_admin', 'admin')
@Controller('admin/campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.campaignsService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status,
      search,
    });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string) {
    return this.campaignsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateCampaignDto) {
    return this.campaignsService.create(dto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.campaignsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string) {
    return this.campaignsService.delete(id);
  }

  @Post(':id/send')
  @HttpCode(HttpStatus.OK)
  async send(@Param('id') id: string) {
    return this.campaignsService.sendCampaign(id);
  }

  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  async testSend(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.campaignsService.sendTestEmail(id, user.email);
  }

  @Get(':id/recipients')
  @HttpCode(HttpStatus.OK)
  async getRecipients(@Param('id') id: string) {
    return this.campaignsService.getRecipientInfo(id);
  }
}
