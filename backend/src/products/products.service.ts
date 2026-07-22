import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, UpdateQuery } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { generateSlug } from '../common/helpers/slug.helper';
import { SortOrder } from '../common/dto/pagination.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async findAll(query: QueryProductDto, includeArchived = false) {
    const {
      page = 1,
      limit = 20,
      sort,
      order,
      search,
      category,
      isActive,
      isFeatured,
      minPrice,
      maxPrice,
      tags,
      sortBy,
      inStock,
      status,
    } = query;

    const filter: QueryFilter<ProductDocument> = {};

    if (!includeArchived) {
      filter.isArchived = { $ne: true };
    }

    if (isActive !== undefined) filter.isActive = isActive;
    if (isFeatured !== undefined) filter.isFeatured = isFeatured;
    if (category) filter.category = category;
    if (inStock !== undefined) filter.inStock = inStock;
    if (status) filter.status = status;

    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceFilter: { $gte?: number; $lte?: number } = {};
      if (minPrice !== undefined) priceFilter.$gte = minPrice;
      if (maxPrice !== undefined) priceFilter.$lte = maxPrice;
      filter.regularPrice = priceFilter;
    }

    if (tags) {
      const tagArray = tags.split(',').map((t) => t.trim());
      filter.tags = { $in: tagArray };
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { sku: { $regex: escaped, $options: 'i' } },
        { fullDescription: { $regex: escaped, $options: 'i' } },
        { tags: { $regex: escaped, $options: 'i' } },
        { shortDescription: { $regex: escaped, $options: 'i' } },
      ];
    }

    let sortObj: Record<string, 1 | -1> = { createdAt: -1 };
    if (sortBy) {
      const orderVal = order === SortOrder.ASC ? 1 : -1;
      sortObj = { [sortBy]: orderVal };
    } else if (sort) {
      const orderVal = order === SortOrder.ASC ? 1 : -1;
      sortObj = { [sort]: orderVal };
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .populate('category')
        .exec(),
      this.productModel.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findBySlug(slug: string) {
    const product = await this.productModel
      .findOne({ slug, isArchived: { $ne: true } })
      .populate('category')
      .exec();

    if (!product) {
      throw new NotFoundException(`Product with slug "${slug}" not found`);
    }

    return product;
  }

  async findById(id: string) {
    const product = await this.productModel
      .findById(id)
      .populate('category')
      .exec();

    if (!product) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }

    return product;
  }

  async create(dto: CreateProductDto) {
    const existingSku = await this.productModel.findOne({ sku: dto.sku });
    if (existingSku) {
      throw new ConflictException(
        `Product with SKU "${dto.sku}" already exists`,
      );
    }

    let slug = generateSlug(dto.name);
    const existingSlug = await this.productModel.findOne({ slug });
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    const inStock = dto.stock > 0;
    const status =
      dto.stock <= 0
        ? 'out_of_stock'
        : dto.stock <= (dto.lowStockThreshold || 5)
          ? 'low_stock'
          : 'in_stock';

    const product = await this.productModel.create({
      ...dto,
      slug,
      inStock,
      status,
      isArchived: false,
    });

    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.productModel.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }

    if (dto.sku && dto.sku !== product.sku) {
      const existingSku = await this.productModel.findOne({
        sku: dto.sku,
        _id: { $ne: id },
      });
      if (existingSku) {
        throw new ConflictException(
          `Product with SKU "${dto.sku}" already exists`,
        );
      }
    }

    const updateData: UpdateQuery<ProductDocument> = { ...dto };

    if (dto.name) {
      const newSlug = generateSlug(dto.name);
      const existingSlug = await this.productModel.findOne({
        slug: newSlug,
        _id: { $ne: id },
      });
      if (!existingSlug) {
        updateData.slug = newSlug;
      }
    }

    if (dto.stock !== undefined) {
      const threshold = dto.lowStockThreshold ?? product.lowStockThreshold;
      updateData.inStock = dto.stock > 0;
      updateData.status =
        dto.stock <= 0
          ? 'out_of_stock'
          : dto.stock <= threshold
            ? 'low_stock'
            : 'in_stock';
    }

    const updated = await this.productModel
      .findByIdAndUpdate(id, { $set: updateData }, { returnDocument: 'after' })
      .populate('category')
      .exec();

    return updated;
  }

  async archive(id: string) {
    const product = await this.productModel.findByIdAndUpdate(
      id,
      { $set: { isArchived: true, isActive: false } },
      { returnDocument: 'after' },
    );

    if (!product) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }

    return product;
  }

  async bulkUpdateStatus(ids: string[], isActive: boolean) {
    const result = await this.productModel.updateMany(
      { _id: { $in: ids }, isArchived: { $ne: true } },
      { $set: { isActive } },
    );

    if (result.matchedCount !== ids.length) {
      throw new NotFoundException('One or more products were not found');
    }

    return { updated: result.modifiedCount, matched: result.matchedCount };
  }

  async delete(id: string) {
    const product = await this.productModel.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }

    await this.productModel.findByIdAndDelete(id);
    return { deleted: true };
  }

  async updateStock(id: string, quantity: number) {
    const product = await this.productModel.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }

    const stock = Math.max(0, quantity);
    const inStock = stock > 0;
    const threshold = product.lowStockThreshold;
    const status =
      stock <= 0
        ? 'out_of_stock'
        : stock <= threshold
          ? 'low_stock'
          : 'in_stock';

    const updated = await this.productModel
      .findByIdAndUpdate(
        id,
        { $set: { stock, inStock, status } },
        { returnDocument: 'after' },
      )
      .exec();

    return updated;
  }

  async getFeatured() {
    return this.productModel
      .find({ isFeatured: true, isActive: true, isArchived: { $ne: true } })
      .populate('category')
      .sort({ createdAt: -1 })
      .limit(20)
      .exec();
  }

  async getBestSellers() {
    return this.productModel
      .find({ isActive: true, isArchived: { $ne: true } })
      .populate('category')
      .sort({ ratingCount: -1, ratingAverage: -1 })
      .limit(20)
      .exec();
  }

  async getLowStock() {
    return this.productModel
      .find({
        isActive: true,
        isArchived: { $ne: true },
        $expr: {
          $and: [
            { $gt: ['$stock', 0] },
            { $lte: ['$stock', '$lowStockThreshold'] },
          ],
        },
      })
      .populate('category')
      .sort({ stock: 1 })
      .exec();
  }

  async searchProducts(query: string) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.productModel
      .find({
        isArchived: { $ne: true },
        $or: [
          { name: { $regex: escaped, $options: 'i' } },
          { fullDescription: { $regex: escaped, $options: 'i' } },
          { shortDescription: { $regex: escaped, $options: 'i' } },
          { tags: { $regex: escaped, $options: 'i' } },
        ],
      })
      .populate('category')
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();
  }

  async updateRating(productId: string, newRating: number) {
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException(`Product with id "${productId}" not found`);
    }

    const oldTotal = product.ratingAverage * product.ratingCount;
    const newCount = product.ratingCount + 1;
    const newAverage = (oldTotal + newRating) / newCount;

    return this.productModel
      .findByIdAndUpdate(
        productId,
        {
          $set: {
            ratingAverage: Math.round(newAverage * 10) / 10,
            ratingCount: newCount,
          },
        },
        { returnDocument: 'after' },
      )
      .exec();
  }
}
