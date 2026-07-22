import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import {
  InventoryMovement,
  InventoryMovementDocument,
  InventoryMovementType,
} from './schemas/inventory-movement.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import {
  ProductVariant,
  ProductVariantDocument,
} from '../product-variants/schemas/product-variant.schema';
import { CreateMovementDto } from './dto/create-movement.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import {
  InventoryStatusFilter,
  QueryInventoryDto,
} from './dto/query-inventory.dto';
import { InventoryListResponseDto } from './dto/inventory-response.dto';
import { SortOrder } from '../common/dto/pagination.dto';

function hasDocumentId(value: DynamicValue): value is { _id: DynamicValue } {
  return typeof value === 'object' && value !== null && '_id' in value;
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectModel(InventoryMovement.name)
    private readonly movementModel: Model<InventoryMovementDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(ProductVariant.name)
    private readonly variantModel: Model<ProductVariantDocument>,
  ) {}

  async getCurrentStock(productId?: string, variantId?: string) {
    const match: DynamicRecord = {};
    if (productId) match._id = productId;

    if (variantId) {
      const variant = await this.variantModel
        .findById(variantId)
        .populate('product')
        .exec();
      if (!variant) throw new NotFoundException('Variant not found');
      return {
        productId: hasDocumentId(variant.product)
          ? variant.product._id instanceof Types.ObjectId
            ? variant.product._id.toHexString()
            : typeof variant.product._id === 'string'
              ? variant.product._id
              : ''
          : variant.product,
        variantId: variant._id,
        sku: variant.sku,
        stock: variant.stock,
        lowStockThreshold: variant.lowStockThreshold,
        status: variant.status,
      };
    }

    if (productId) {
      const product = await this.productModel.findById(productId).exec();
      if (!product) throw new NotFoundException('Product not found');
      return {
        productId: product._id,
        name: product.name,
        sku: product.sku,
        stock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
        status: product.status,
        inStock: product.inStock,
      };
    }

    const products = await this.productModel
      .find({ isArchived: false })
      .select('name sku stock lowStockThreshold status inStock')
      .sort({ name: 1 })
      .exec();

    return products.map((p) => ({
      productId: p._id,
      name: p.name,
      sku: p.sku,
      stock: p.stock,
      lowStockThreshold: p.lowStockThreshold,
      status: p.status,
    }));
  }

  async getPaginatedStock(
    params: QueryInventoryDto,
  ): Promise<InventoryListResponseDto> {
    const { page = 1, limit = 20, search, status } = params;
    const match: QueryFilter<Product> = { isArchived: false };

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      match.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { sku: { $regex: escaped, $options: 'i' } },
      ];
    }

    if (params.category) match.category = params.category;
    if (status === InventoryStatusFilter.IN_STOCK) match.inStock = true;
    else if (
      status === InventoryStatusFilter.OUT_OF_STOCK ||
      params.outOfStock
    ) {
      match.stock = { $lte: 0 };
    } else if (status === InventoryStatusFilter.LOW_STOCK || params.lowStock) {
      match.$expr = {
        $and: [
          { $gt: ['$stock', 0] },
          { $lte: ['$stock', '$lowStockThreshold'] },
        ],
      };
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.productModel
        .find(match)
        .select('name sku stock lowStockThreshold status inStock images')
        .sort({
          [params.sort ?? 'name']: params.order === SortOrder.DESC ? -1 : 1,
        })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.productModel.countDocuments(match),
    ]);

    return {
      items: items.map((p) => ({
        productId: p._id.toString(),
        productName: p.name,
        productImage: p.images[0]?.startsWith('/') ? p.images[0] : undefined,
        sku: p.sku,
        currentStock: p.stock,
        lowStockThreshold: p.lowStockThreshold,
        inStock: p.inStock,
        isActive: p.isActive,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLowStockItems(threshold?: number) {
    const match: DynamicRecord = { isArchived: false };
    if (threshold) {
      match.$expr = {
        $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', threshold] }],
      };
    } else {
      match.$expr = {
        $and: [
          { $gt: ['$stock', 0] },
          { $lte: ['$stock', '$lowStockThreshold'] },
        ],
      };
    }

    return this.productModel
      .find(match)
      .select('name sku stock lowStockThreshold status')
      .sort({ stock: 1 })
      .exec();
  }

  async getOutOfStockItems() {
    return this.productModel
      .find({ stock: { $lte: 0 }, isArchived: false })
      .select('name sku stock status')
      .sort({ name: 1 })
      .exec();
  }

  async createMovement(dto: CreateMovementDto, performedBy?: string) {
    const product = await this.productModel.findById(dto.productId).exec();
    if (!product) throw new NotFoundException('Product not found');

    let variant: ProductVariantDocument | null = null;
    let previousStock = product.stock;

    if (dto.variantId) {
      variant = await this.variantModel.findById(dto.variantId).exec();
      if (!variant) throw new NotFoundException('Variant not found');
      previousStock = variant.stock;
    }

    const movement = await this.movementModel.create({
      product: dto.productId,
      variant: dto.variantId ?? undefined,
      type: dto.type,
      quantity: dto.quantity,
      previousStock,
      newStock:
        dto.type === InventoryMovementType.DEDUCTION ||
        dto.type === InventoryMovementType.SALE
          ? previousStock - dto.quantity
          : previousStock + dto.quantity,
      reference: dto.reference,
      reason: dto.reason,
      performedBy,
    });

    return movement;
  }

  async getMovements(query: {
    page?: number;
    limit?: number;
    productId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { page = 1, limit = 20, productId, type, startDate, endDate } = query;
    const filter: DynamicRecord = {};

    if (productId) filter.product = productId;
    if (type) filter.type = type;
    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      filter.createdAt = dateFilter;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.movementModel
        .find(filter)
        .populate('product', 'name sku')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.movementModel.countDocuments(filter),
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

  async adjustStock(dto: AdjustStockDto, performedBy?: string) {
    const product = await this.productModel.findById(dto.productId).exec();
    if (!product) throw new NotFoundException('Product not found');

    if (dto.variantId) {
      const variant = await this.variantModel.findById(dto.variantId).exec();
      if (!variant) throw new NotFoundException('Variant not found');

      const prevStock = variant.stock;
      variant.stock += dto.quantity;
      if (variant.stock < 0) {
        throw new BadRequestException('Insufficient stock');
      }

      const inStock = variant.stock > 0;
      const threshold = variant.lowStockThreshold || 5;
      variant.status =
        variant.stock <= 0
          ? 'out_of_stock'
          : variant.stock <= threshold
            ? 'low_stock'
            : 'in_stock';
      variant.inStock = inStock;
      await variant.save();

      await this.movementModel.create({
        product: dto.productId,
        variant: dto.variantId,
        type: InventoryMovementType.ADJUSTMENT,
        quantity: Math.abs(dto.quantity),
        previousStock: prevStock,
        newStock: variant.stock,
        reason: dto.reason,
        performedBy,
      });

      return variant;
    }

    const prevStock = product.stock;
    product.stock += dto.quantity;
    if (product.stock < 0) {
      throw new BadRequestException('Insufficient stock');
    }

    const inStock = product.stock > 0;
    const threshold = product.lowStockThreshold;
    product.status =
      product.stock <= 0
        ? 'out_of_stock'
        : product.stock <= threshold
          ? 'low_stock'
          : 'in_stock';
    product.inStock = inStock;
    await product.save();

    await this.movementModel.create({
      product: dto.productId,
      type: InventoryMovementType.ADJUSTMENT,
      quantity: Math.abs(dto.quantity),
      previousStock: prevStock,
      newStock: product.stock,
      reason: dto.reason,
      performedBy,
    });

    return product;
  }

  async reserveStock(
    orderId: string,
    items: { productId: string; variantId?: string; quantity: number }[],
  ) {
    const movements: InventoryMovementDocument[] = [];

    for (const item of items) {
      const product = await this.productModel.findById(item.productId).exec();
      if (!product) {
        this.logger.warn(
          `Product ${item.productId} not found for stock reservation`,
        );
        continue;
      }

      if (item.variantId) {
        const variant = await this.variantModel.findById(item.variantId).exec();
        if (!variant) continue;

        const prevStock = variant.stock;
        variant.stock -= item.quantity;
        if (variant.stock < 0) variant.stock = 0;

        const inStock = variant.stock > 0;
        const threshold = variant.lowStockThreshold || 5;
        variant.status =
          variant.stock <= 0
            ? 'out_of_stock'
            : variant.stock <= threshold
              ? 'low_stock'
              : 'in_stock';
        variant.inStock = inStock;
        await variant.save();

        const movement = await this.movementModel.create({
          product: item.productId,
          variant: item.variantId,
          type: InventoryMovementType.RESERVATION,
          quantity: item.quantity,
          previousStock: prevStock,
          newStock: variant.stock,
          reference: `order-${orderId}`,
          reason: 'Stock reserved for order',
        });
        movements.push(movement);
      } else {
        const prevStock = product.stock;
        product.stock -= item.quantity;
        if (product.stock < 0) product.stock = 0;

        const inStock = product.stock > 0;
        const threshold = product.lowStockThreshold;
        product.status =
          product.stock <= 0
            ? 'out_of_stock'
            : product.stock <= threshold
              ? 'low_stock'
              : 'in_stock';
        product.inStock = inStock;
        await product.save();

        const movement = await this.movementModel.create({
          product: item.productId,
          type: InventoryMovementType.RESERVATION,
          quantity: item.quantity,
          previousStock: prevStock,
          newStock: product.stock,
          reference: `order-${orderId}`,
          reason: 'Stock reserved for order',
        });
        movements.push(movement);
      }
    }

    return movements;
  }

  async releaseStock(
    orderId: string,
    items: { productId: string; variantId?: string; quantity: number }[],
  ) {
    const movements: InventoryMovementDocument[] = [];

    for (const item of items) {
      const product = await this.productModel.findById(item.productId).exec();
      if (!product) continue;

      if (item.variantId) {
        const variant = await this.variantModel.findById(item.variantId).exec();
        if (!variant) continue;

        const prevStock = variant.stock;
        variant.stock += item.quantity;

        const inStock = variant.stock > 0;
        const threshold = variant.lowStockThreshold || 5;
        variant.status =
          variant.stock <= 0
            ? 'out_of_stock'
            : variant.stock <= threshold
              ? 'low_stock'
              : 'in_stock';
        variant.inStock = inStock;
        await variant.save();

        const movement = await this.movementModel.create({
          product: item.productId,
          variant: item.variantId,
          type: InventoryMovementType.CANCELLATION,
          quantity: item.quantity,
          previousStock: prevStock,
          newStock: variant.stock,
          reference: `order-${orderId}`,
          reason: 'Stock released due to cancellation',
        });
        movements.push(movement);
      } else {
        const prevStock = product.stock;
        product.stock += item.quantity;

        const inStock = product.stock > 0;
        const threshold = product.lowStockThreshold;
        product.status =
          product.stock <= 0
            ? 'out_of_stock'
            : product.stock <= threshold
              ? 'low_stock'
              : 'in_stock';
        product.inStock = inStock;
        await product.save();

        const movement = await this.movementModel.create({
          product: item.productId,
          type: InventoryMovementType.CANCELLATION,
          quantity: item.quantity,
          previousStock: prevStock,
          newStock: product.stock,
          reference: `order-${orderId}`,
          reason: 'Stock released due to cancellation',
        });
        movements.push(movement);
      }
    }

    return movements;
  }

  async getStockReport() {
    const products = await this.productModel
      .find({ isArchived: false })
      .select(
        'name sku stock lowStockThreshold status inStock regularPrice salePrice costPrice',
      )
      .sort({ name: 1 })
      .exec();

    const report = products.map((p) => {
      const currentStockValue = p.stock * (p.costPrice || 0);
      const price = p.salePrice || p.regularPrice;
      const potentialRevenue = p.stock * price;

      return {
        productId: p._id,
        name: p.name,
        sku: p.sku,
        currentStock: p.stock,
        lowStockThreshold: p.lowStockThreshold,
        status: p.status,
        inStock: p.inStock,
        costPrice: p.costPrice || 0,
        sellingPrice: price,
        currentStockValue: Math.round(currentStockValue * 100) / 100,
        potentialRevenue: Math.round(potentialRevenue * 100) / 100,
      };
    });

    const summary = {
      totalProducts: report.length,
      totalStock: report.reduce((sum, r) => sum + r.currentStock, 0),
      totalStockValue:
        Math.round(
          report.reduce((sum, r) => sum + r.currentStockValue, 0) * 100,
        ) / 100,
      totalPotentialRevenue:
        Math.round(
          report.reduce((sum, r) => sum + r.potentialRevenue, 0) * 100,
        ) / 100,
      lowStockCount: report.filter((r) => r.status === 'low_stock').length,
      outOfStockCount: report.filter((r) => r.status === 'out_of_stock').length,
    };

    return { summary, items: report };
  }
}
