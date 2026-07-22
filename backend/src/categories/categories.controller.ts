import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { QueryCategoriesDto } from './dto/query-categories.dto';

@Controller()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get('categories')
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query()
    query: QueryCategoriesDto,
  ) {
    return this.categoriesService.findAll(query);
  }

  @Public()
  @Get('categories/tree')
  @HttpCode(HttpStatus.OK)
  async getTree() {
    return this.categoriesService.getCategoryTree();
  }

  @Public()
  @Get('categories/active')
  @HttpCode(HttpStatus.OK)
  async getActive() {
    return this.categoriesService.getActive();
  }

  @Public()
  @Get('categories/:slug')
  @HttpCode(HttpStatus.OK)
  async findBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Get('admin/categories')
  @HttpCode(HttpStatus.OK)
  async adminFindAll(
    @Query()
    query: QueryCategoriesDto,
  ) {
    return this.categoriesService.findAll(query);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Post('admin/categories')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Patch('admin/categories/:id')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @Delete('admin/categories/:id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return this.categoriesService.delete(id);
  }
}
