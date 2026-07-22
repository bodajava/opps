import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import * as crypto from 'crypto';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import {
  VerificationProof,
  VerificationProofDocument,
  ProofPurpose,
} from '../email-verification/schemas/verification-proof.schema';
import {
  ProductVariant,
  ProductVariantDocument,
} from '../product-variants/schemas/product-variant.schema';
import {
  InventoryMovement,
  InventoryMovementDocument,
  InventoryMovementType,
} from '../inventory/schemas/inventory-movement.schema';
import { CouponsService } from '../coupons/coupons.service';
import { DeliveryZonesService } from '../delivery-zones/delivery-zones.service';
import { OrdersService } from '../orders/orders.service';
import { CartService } from '../cart/cart.service';
import { PricingService } from '../common/services/pricing.service';
import { CheckoutQuoteDto } from './dto/checkout-quote.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  optionalDynamicRecord,
  textValue,
  toDynamicRecord,
} from '../common/helpers/dynamic-value.helper';

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(ProductVariant.name)
    private readonly variantModel: Model<ProductVariantDocument>,
    @InjectModel(InventoryMovement.name)
    private readonly inventoryMovementModel: Model<InventoryMovementDocument>,
    @InjectModel(VerificationProof.name)
    private readonly proofModel: Model<VerificationProofDocument>,
    private readonly couponsService: CouponsService,
    private readonly deliveryZonesService: DeliveryZonesService,
    private readonly ordersService: OrdersService,
    private readonly cartService: CartService,
    private readonly pricingService: PricingService,
  ) {}

  async getQuote(dto: CheckoutQuoteDto) {
    const enrichedItems = await this.validateAndEnrichItems(dto.items);

    let discount = 0;
    if (dto.couponCode) {
      const result = await this.couponsService.validateCoupon(
        dto.couponCode,
        enrichedItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
        enrichedItems.map((i) => ({ productId: i.productId })),
      );
      discount = result.discount;
    }

    const delivery = await this.deliveryZonesService.calculateDeliveryFee(
      dto.governorate,
      enrichedItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    );

    const pricing = this.pricingService.calculate({
      items: enrichedItems.map((i) => ({
        unitPrice: i.unitPrice,
        quantity: i.quantity,
      })),
      discount,
      deliveryFee: delivery.deliveryFee,
    });

    return {
      items: enrichedItems.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        name: i.name,
        image: i.image,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
      })),
      subtotal: pricing.subtotal,
      discount: pricing.discount,
      deliveryFee: pricing.deliveryFee,
      freeDelivery: delivery.freeDelivery,
      estimatedDeliveryDays: delivery.estimatedDays,
      codAvailable: delivery.codAvailable,
      total: pricing.total,
    };
  }

  async createOrder(dto: CreateOrderDto, sessionId?: string, userId?: string) {
    if (userId) {
      const authUserModel = this.proofModel.db.model('User');
      const userResult = await authUserModel
        .findOne({ _id: userId }, 'email isActive isBlocked')
        .lean<{ email: string; isActive: boolean; isBlocked: boolean }>()
        .exec();
      if (!userResult) {
        throw new BadRequestException('Authenticated user not found');
      }
      if (!userResult.isActive || userResult.isBlocked) {
        throw new ForbiddenException('Account is inactive or blocked');
      }
      if (userResult.email !== dto.customerEmail.toLowerCase().trim()) {
        throw new BadRequestException(
          'Order email must match your account email',
        );
      }
    } else {
      if (!dto.verificationProof) {
        throw new BadRequestException(
          'Email verification proof is required for guest checkout',
        );
      }

      const tokenHash = crypto
        .createHash('sha256')
        .update(dto.verificationProof)
        .digest('hex');

      const proof = await this.proofModel.findOne({ tokenHash }).exec();

      if (!proof) {
        throw new BadRequestException('Invalid verification proof');
      }

      if (proof.email !== dto.customerEmail.toLowerCase().trim()) {
        throw new BadRequestException(
          'Verification proof email does not match order email',
        );
      }

      if (proof.purpose !== ProofPurpose.CHECKOUT_VERIFICATION) {
        throw new BadRequestException('Invalid verification proof purpose');
      }

      if (proof.consumedAt) {
        throw new BadRequestException(
          'Verification proof has already been used',
        );
      }

      if (new Date() > proof.expiresAt) {
        throw new BadRequestException('Verification proof has expired');
      }

      proof.consumedAt = new Date();
      await proof.save();
    }

    if (dto.idempotencyKey) {
      const existingOrder = await this.ordersService.findByIdempotencyKey(
        dto.idempotencyKey,
      );
      if (existingOrder) {
        this.logger.log(
          `Returning existing order for idempotency key ${dto.idempotencyKey}`,
        );
        return existingOrder;
      }
    }

    const enrichedItems = await this.validateAndEnrichItems(dto.items);

    let discount = 0;
    let couponId: string | undefined;
    if (dto.couponCode) {
      const result = await this.couponsService.validateCoupon(
        dto.couponCode,
        enrichedItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
        enrichedItems.map((i) => ({ productId: i.productId })),
        dto.customerEmail,
      );
      discount = result.discount;
      couponId = result.coupon._id.toString();
    }

    const delivery = await this.deliveryZonesService.calculateDeliveryFee(
      dto.shippingAddress.governorate,
      enrichedItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    );

    const pricing = this.pricingService.calculate({
      items: enrichedItems.map((i) => ({
        unitPrice: i.unitPrice,
        quantity: i.quantity,
      })),
      discount,
      deliveryFee: delivery.deliveryFee,
    });

    const maxRetries = 5;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const session: ClientSession = await this.productModel.db.startSession();
      try {
        session.startTransaction();

        for (const item of enrichedItems) {
          if (item.variantId) {
            const variant = await this.variantModel
              .findById(item.variantId)
              .session(session);
            if (!variant || variant.stock < item.quantity) {
              throw new BadRequestException(
                `Insufficient stock for variant "${variant?.name || item.variantId}". Available: ${variant?.stock || 0}`,
              );
            }

            const prevStock = variant.stock;
            variant.stock -= item.quantity;
            await variant.save({ session });

            await this.inventoryMovementModel.create(
              [
                {
                  product: item.productId,
                  variant: item.variantId ?? undefined,
                  type: InventoryMovementType.SALE,
                  quantity: item.quantity,
                  previousStock: prevStock,
                  newStock: variant.stock,
                  reference: 'order',
                  reason: 'Order placement',
                },
              ],
              { session },
            );
          } else {
            const product = await this.productModel
              .findById(item.productId)
              .session(session);
            if (!product || product.stock < item.quantity) {
              throw new BadRequestException(
                `Insufficient stock for "${product?.name || item.productId}". Available: ${product?.stock || 0}`,
              );
            }

            const prevStock = product.stock;
            product.stock -= item.quantity;
            const inStock = product.stock > 0;
            const threshold = product.lowStockThreshold;
            const status =
              product.stock <= 0
                ? 'out_of_stock'
                : product.stock <= threshold
                  ? 'low_stock'
                  : 'in_stock';
            product.inStock = inStock;
            product.status = status;
            await product.save({ session });

            await this.inventoryMovementModel.create(
              [
                {
                  product: item.productId,
                  type: InventoryMovementType.SALE,
                  quantity: item.quantity,
                  previousStock: prevStock,
                  newStock: product.stock,
                  reference: 'order',
                  reason: 'Order placement',
                },
              ],
              { session },
            );
          }
        }

        const shippingAddress = {
          street: dto.shippingAddress.street,
          apartment: dto.shippingAddress.apartment || '',
          building: dto.shippingAddress.buildingNumber,
          floor: dto.shippingAddress.floor || '',
          city: dto.shippingAddress.city,
          state: dto.shippingAddress.governorate,
          zipCode: '',
          country: 'Egypt',
          landmark: dto.shippingAddress.landmark || '',
        };

        const order = await this.ordersService.create(
          {
            customerName: dto.customerName,
            customerEmail: dto.customerEmail,
            customerPhone: dto.customerPhone,
            secondaryPhone: dto.secondaryPhone,
            shippingAddress,
            items: enrichedItems.map((i) => ({
              product: i.productId,
              variant: i.variantId,
              name: i.name,
              image: i.image,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              totalPrice: i.totalPrice,
            })),
            subtotal: pricing.subtotal,
            discount: pricing.discount,
            deliveryFee: pricing.deliveryFee,
            total: pricing.total,
            couponCode: dto.couponCode,
            paymentMethod: dto.paymentMethod,
            customerNotes: dto.customerNotes,
            userId,
            idempotencyKey: dto.idempotencyKey,
          },
          session,
        );

        if (couponId) {
          await this.couponsService.recordUsage(
            couponId,
            order._id.toString(),
            userId,
            dto.customerEmail,
            discount,
          );
        }

        await session.commitTransaction();

        try {
          if (sessionId) {
            await this.cartService.clearCart(sessionId, userId);
          }
        } catch (err) {
          this.logger.warn('Failed to clear cart after order placement', err);
        }

        return order;
      } catch (error) {
        await session.abortTransaction();
        const mongoError =
          error && typeof error === 'object' ? toDynamicRecord(error) : {};
        const errorResponse = optionalDynamicRecord(mongoError.errorResponse);
        const responseLabels = Array.isArray(errorResponse?.errorLabels)
          ? errorResponse.errorLabels.filter(
              (label): label is string => typeof label === 'string',
            )
          : [];
        const errorLabelSet =
          mongoError.errorLabelSet instanceof Set
            ? mongoError.errorLabelSet
            : new Set<string>();
        const hasTransientError =
          errorLabelSet.has('TransientTransactionError') ||
          errorLabelSet.has('UnknownTransactionCommitResult') ||
          responseLabels.includes('TransientTransactionError') ||
          responseLabels.includes('UnknownTransactionCommitResult');

        if (
          textValue(mongoError.name) === 'MongoServerError' &&
          hasTransientError &&
          attempt < maxRetries &&
          !(error instanceof BadRequestException)
        ) {
          const delayMs =
            Math.min(50 * 2 ** attempt, 1000) + Math.random() * 50;
          this.logger.warn(
            `Transaction conflict on attempt ${attempt}/${maxRetries}, retrying in ${Math.round(delayMs)}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          lastError = error instanceof Error ? error : new Error(String(error));
          continue;
        }
        throw error;
      } finally {
        void session.endSession();
      }
    }

    throw (
      lastError ||
      new BadRequestException('Failed to place order after retries')
    );
  }

  private async validateAndEnrichItems(
    items: { productId: string; variantId?: string; quantity: number }[],
  ): Promise<
    {
      productId: string;
      variantId?: string;
      name: string;
      image: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }[]
  > {
    const enriched: {
      productId: string;
      variantId?: string;
      name: string;
      image: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }[] = [];

    for (const item of items) {
      const product = await this.productModel.findById(item.productId);
      if (!product || !product.isActive || product.isArchived) {
        throw new BadRequestException(
          `Product "${item.productId}" not found or unavailable`,
        );
      }

      let unitPrice = product.salePrice ?? product.regularPrice;
      let name = product.name;
      const image = product.thumbnail || product.images?.[0] || '';

      if (item.variantId) {
        const variant = await this.variantModel.findOne({
          _id: item.variantId,
          product: item.productId,
          isActive: true,
        });
        if (!variant) {
          throw new BadRequestException(
            `Variant "${item.variantId}" not found for product "${product.name}"`,
          );
        }
        unitPrice = variant.salePrice ?? variant.price;
        name = `${product.name} - ${variant.name}`;
      }

      if (item.quantity < 1) {
        throw new BadRequestException('Quantity must be at least 1');
      }

      enriched.push({
        productId: item.productId,
        variantId: item.variantId,
        name,
        image,
        quantity: item.quantity,
        unitPrice,
        totalPrice: unitPrice * item.quantity,
      });
    }

    return enriched;
  }
}
