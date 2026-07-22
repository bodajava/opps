import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SettingsService } from './settings.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import type { SettingValue } from './types/setting-value.type';

@Controller()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Public()
  @Get('settings/public')
  @HttpCode(HttpStatus.OK)
  async getPublicSettings() {
    return this.settingsService.getStoreSettings();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Get('admin/settings')
  @HttpCode(HttpStatus.OK)
  async getSettings(@Query('group') group?: string) {
    return this.settingsService.getAll(group);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Put('admin/settings/:key')
  @HttpCode(HttpStatus.OK)
  async updateSetting(
    @Param('key') key: string,
    @Body('value') value: SettingValue,
    @Body('group') group?: string,
    @Body('description') description?: string,
  ) {
    return this.settingsService.set(key, value, group, description);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Delete('admin/settings/:key')
  @HttpCode(HttpStatus.OK)
  async deleteSetting(@Param('key') key: string) {
    return this.settingsService.delete(key);
  }
}
