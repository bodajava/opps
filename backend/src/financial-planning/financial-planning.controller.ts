import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FinancialPlanningService } from './financial-planning.service';
import { UpdateFinancialSettingDto } from './dto/update-financial-setting.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('super_admin', 'admin')
@Controller('admin/financial')
export class FinancialPlanningController {
  constructor(
    private readonly financialPlanningService: FinancialPlanningService,
  ) {}

  @Get('break-even')
  @HttpCode(HttpStatus.OK)
  async calculateBreakEven() {
    return this.financialPlanningService.calculateBreakEven();
  }

  @Get('profitability')
  @HttpCode(HttpStatus.OK)
  async getProfitability(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financialPlanningService.getProfitabilityReport(
      startDate,
      endDate,
    );
  }

  @Get('settings')
  @HttpCode(HttpStatus.OK)
  async getSettings() {
    return this.financialPlanningService.getFinancialSettings();
  }

  @Post('settings')
  @HttpCode(HttpStatus.CREATED)
  async updateSetting(@Body() dto: UpdateFinancialSettingDto) {
    return this.financialPlanningService.updateSetting(dto);
  }

  @Delete('settings/:key')
  @HttpCode(HttpStatus.OK)
  async deleteSetting(@Param('key') key: string) {
    return this.financialPlanningService.deleteSetting(key);
  }

  @Get('expenses')
  @HttpCode(HttpStatus.OK)
  async getExpenses(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: string,
    @Query('category') category?: string,
  ) {
    return this.financialPlanningService.getExpenseRecords({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      startDate,
      endDate,
      type,
      category,
    });
  }

  @Post('expenses')
  @HttpCode(HttpStatus.CREATED)
  async addExpense(@Body() dto: CreateExpenseDto) {
    return this.financialPlanningService.addExpenseRecord(dto);
  }
}
