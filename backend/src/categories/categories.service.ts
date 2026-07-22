import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, UpdateQuery } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { generateSlug } from '../common/helpers/slug.helper';
import {
  CategoryListResponseDto,
  CategoryResponseDto,
} from './dto/category-response.dto';
import { QueryCategoriesDto } from './dto/query-categories.dto';
import { SortOrder } from '../common/dto/pagination.dto';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async findAll(query: QueryCategoriesDto): Promise<CategoryListResponseDto> {
    const { page = 1, limit = 20, search, isActive } = query;
    const filter: QueryFilter<Category> = {};

    if (isActive !== undefined) filter.isActive = isActive;
    if (query.parent) filter.parent = query.parent;

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.name = { $regex: escaped, $options: 'i' };
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.categoryModel
        .find(filter)
        .sort({
          [query.sort ?? 'sortOrder']: query.order === SortOrder.DESC ? -1 : 1,
          name: 1,
        })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.categoryModel.countDocuments(filter),
    ]);

    return {
      items: items.map((category) => this.toResponse(category)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private toResponse(category: CategoryDocument): CategoryResponseDto {
    return {
      id: category._id.toString(),
      name: category.name,
      slug: category.slug,
      description: category.description || undefined,
      image: category.image?.startsWith('/') ? category.image : undefined,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
      parentId: category.parent ? category.parent.toString() : undefined,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    };
  }

  async findBySlug(slug: string) {
    const category = await this.categoryModel.findOne({ slug }).exec();
    if (!category) {
      throw new NotFoundException(`Category with slug "${slug}" not found`);
    }
    return category;
  }

  async findById(id: string) {
    const category = await this.categoryModel.findById(id).exec();
    if (!category) {
      throw new NotFoundException(`Category with id "${id}" not found`);
    }
    return category;
  }

  async create(dto: CreateCategoryDto) {
    const existingName = await this.categoryModel.findOne({ name: dto.name });
    if (existingName) {
      throw new ConflictException(
        `Category with name "${dto.name}" already exists`,
      );
    }

    let slug = generateSlug(dto.name);
    const existingSlug = await this.categoryModel.findOne({ slug });
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    return this.categoryModel.create({ ...dto, slug });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.categoryModel.findById(id);
    if (!category) {
      throw new NotFoundException(`Category with id "${id}" not found`);
    }

    const updateData: UpdateQuery<CategoryDocument> = { ...dto };

    if (dto.name && dto.name !== category.name) {
      const existingName = await this.categoryModel.findOne({
        name: dto.name,
        _id: { $ne: id },
      });
      if (existingName) {
        throw new ConflictException(
          `Category with name "${dto.name}" already exists`,
        );
      }

      const newSlug = generateSlug(dto.name);
      const existingSlug = await this.categoryModel.findOne({
        slug: newSlug,
        _id: { $ne: id },
      });
      if (!existingSlug) {
        updateData.slug = newSlug;
      }
    }

    const updated = await this.categoryModel
      .findByIdAndUpdate(id, { $set: updateData }, { returnDocument: 'after' })
      .exec();

    return updated;
  }

  async delete(id: string) {
    const category = await this.categoryModel.findById(id);
    if (!category) {
      throw new NotFoundException(`Category with id "${id}" not found`);
    }

    const childrenCount = await this.categoryModel.countDocuments({
      parent: id,
    });
    if (childrenCount > 0) {
      await this.categoryModel.updateMany(
        { parent: id },
        { $set: { parent: null } },
      );
    }

    await this.categoryModel.findByIdAndDelete(id);
    return { deleted: true };
  }

  async getActive() {
    return this.categoryModel
      .find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .exec();
  }

  async getCategoryTree() {
    const categories = await this.categoryModel
      .find({})
      .sort({ sortOrder: 1, name: 1 })
      .exec();
    type CategoryTreeNode = ReturnType<CategoryDocument['toObject']> & {
      children: CategoryTreeNode[];
    };
    const map = new Map<string, CategoryTreeNode>();
    const roots: CategoryTreeNode[] = [];

    categories.forEach((cat) => {
      map.set(cat._id.toString(), { ...cat.toObject(), children: [] });
    });

    categories.forEach((cat) => {
      const id = cat._id.toString();
      const node = map.get(id);
      if (cat.parent && map.has(cat.parent.toString())) {
        const parent = map.get(cat.parent.toString());
        if (parent && node) parent.children.push(node);
      } else {
        if (node) roots.push(node);
      }
    });

    return roots;
  }
}
