import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart, CartDocument } from './schemas/cart.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import {
  ProductVariant,
  ProductVariantDocument,
} from '../product-variants/schemas/product-variant.schema';
import { CouponsService } from '../coupons/coupons.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(ProductVariant.name)
    private readonly variantModel: Model<ProductVariantDocument>,
    private readonly couponsService: CouponsService,
  ) {}

  async getCart(sessionId: string, userId?: string): Promise<CartDocument> {
    let cart = await this.cartModel.findOne({
      $or: [{ sessionId }, ...(userId ? [{ user: userId }] : [])],
    });

    if (!cart) {
      cart = await this.cartModel.create({
        sessionId,
        ...(userId ? { user: userId } : {}),
        items: [],
        subtotal: 0,
        discount: 0,
        deliveryFee: 0,
        total: 0,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    }

    return cart;
  }

  async addItem(
    sessionId: string,
    userId: string | undefined,
    dto: AddToCartDto,
  ): Promise<CartDocument> {
    const product = await this.productModel.findById(dto.productId);
    if (!product || !product.isActive || product.isArchived) {
      throw new NotFoundException('Product not found or unavailable');
    }

    const price = product.salePrice ?? product.regularPrice;

    if (dto.variantId) {
      const variant = await this.variantModel.findOne({
        _id: dto.variantId,
        product: dto.productId,
        isActive: true,
      });
      if (!variant) {
        throw new NotFoundException('Variant not found or unavailable');
      }
    }

    const cart = await this.getCart(sessionId, userId);

    if (dto.variantId) {
      const variant = await this.variantModel.findById(dto.variantId);
      if (!variant || !variant.isActive) {
        throw new NotFoundException('Variant not found or unavailable');
      }
      if (variant.stock < dto.quantity) {
        throw new BadRequestException(
          `Insufficient stock for variant "${variant.name}". Available: ${variant.stock}`,
        );
      }
    } else {
      if (product.stock < dto.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${product.name}". Available: ${product.stock}`,
        );
      }
    }

    const existingIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === dto.productId &&
        (!dto.variantId || item.variant?.toString() === dto.variantId),
    );

    if (existingIndex > -1) {
      const newQty = cart.items[existingIndex].quantity + dto.quantity;
      const maxStock = dto.variantId
        ? ((await this.variantModel.findById(dto.variantId).exec())?.stock ??
          product.stock)
        : product.stock;
      if (newQty > maxStock) {
        throw new BadRequestException(
          `Cannot add more. Maximum available: ${maxStock}`,
        );
      }
      cart.items[existingIndex].quantity = newQty;
      cart.items[existingIndex].subtotal = price * newQty;
    } else {
      let variantPrice = price;
      if (dto.variantId) {
        const variant = await this.variantModel.findById(dto.variantId).exec();
        if (variant) {
          variantPrice = variant.salePrice ?? variant.price;
        }
      }

      cart.items.push({
        product: dto.productId,
        variant: dto.variantId,
        name: product.name,
        image: product.thumbnail || product.images?.[0] || '',
        price: variantPrice,
        quantity: dto.quantity,
        subtotal: variantPrice * dto.quantity,
      });
    }

    await this.recalculateCart(cart);
    return cart.save();
  }

  async updateItemQuantity(
    sessionId: string,
    userId: string | undefined,
    dto: UpdateCartItemDto,
  ): Promise<CartDocument> {
    const cart = await this.getCart(sessionId, userId);
    const itemIdx = cart.items.findIndex(
      (i) => i._id?.toString() === dto.itemId,
    );
    if (itemIdx === -1) {
      throw new NotFoundException('Cart item not found');
    }
    const item = cart.items[itemIdx];

    const product = await this.productModel.findById(item.product);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (item.variant) {
      const variant = await this.variantModel.findById(item.variant).exec();
      if (!variant || !variant.isActive) {
        throw new NotFoundException('Variant not found or unavailable');
      }
      if (dto.quantity > variant.stock) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${variant.stock}`,
        );
      }
    } else {
      if (dto.quantity > product.stock) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${product.stock}`,
        );
      }
    }

    let price = product.salePrice ?? product.regularPrice;
    if (item.variant) {
      const variant = await this.variantModel.findById(item.variant).exec();
      if (variant) {
        price = variant.salePrice ?? variant.price;
      }
    }

    item.quantity = dto.quantity;
    item.price = price;
    item.subtotal = price * dto.quantity;

    await this.recalculateCart(cart);
    return cart.save();
  }

  async removeItem(
    sessionId: string,
    userId: string | undefined,
    itemId: string,
  ): Promise<CartDocument> {
    const cart = await this.getCart(sessionId, userId);
    const itemIdx = cart.items.findIndex((i) => i._id?.toString() === itemId);
    if (itemIdx === -1) {
      throw new NotFoundException('Cart item not found');
    }

    cart.items.splice(itemIdx, 1);
    await this.recalculateCart(cart);
    return cart.save();
  }

  async applyCoupon(
    sessionId: string,
    userId: string | undefined,
    code: string,
  ): Promise<CartDocument> {
    const cart = await this.getCart(sessionId, userId);
    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    await this.recalculateCart(cart);

    const result = await this.couponsService.validateCoupon(
      code,
      cart.subtotal,
      cart.items.map((i) => ({
        productId: i.product.toString(),
      })),
    );

    cart.couponCode = code;
    cart.discount = result.discount;

    this.calculateCart(cart);
    return cart.save();
  }

  async removeCoupon(
    sessionId: string,
    userId: string | undefined,
  ): Promise<CartDocument> {
    const cart = await this.getCart(sessionId, userId);
    cart.couponCode = undefined;
    cart.discount = 0;
    this.calculateCart(cart);
    return cart.save();
  }

  async clearCart(sessionId: string, userId?: string): Promise<CartDocument> {
    const cart = await this.getCart(sessionId, userId);
    cart.items = [];
    cart.couponCode = undefined;
    cart.discount = 0;
    cart.subtotal = 0;
    cart.deliveryFee = 0;
    cart.total = 0;
    return cart.save();
  }

  async mergeCart(sessionId: string, userId: string): Promise<CartDocument> {
    const guestCart = await this.cartModel.findOne({
      sessionId,
      user: { $exists: false },
    });
    const userCart = await this.cartModel.findOne({ user: userId });

    if (!guestCart || guestCart.items.length === 0) {
      if (userCart) return userCart;
      return this.getCart(sessionId, userId);
    }

    if (!userCart) {
      guestCart.user = userId?.toString();
      return guestCart.save();
    }

    for (const guestItem of guestCart.items) {
      const existing = userCart.items.find(
        (ui) =>
          ui.product.toString() === guestItem.product.toString() &&
          (!guestItem.variant ||
            ui.variant?.toString() === guestItem.variant?.toString()),
      );

      if (existing) {
        existing.quantity = Math.max(existing.quantity, guestItem.quantity);
      } else {
        userCart.items.push(guestItem);
      }
    }

    await this.recalculateCart(userCart);
    await guestCart.deleteOne();
    return userCart.save();
  }

  private async recalculateCart(cart: CartDocument): Promise<void> {
    for (const item of cart.items) {
      const product = await this.productModel.findById(item.product);
      if (!product) continue;

      let price: number | null = product.salePrice ?? product.regularPrice;
      if (item.variant) {
        const variant = await this.variantModel.findById(item.variant).exec();
        if (variant) {
          price = variant.salePrice ?? variant.price;
        }
      }

      if (price) {
        item.price = price;
        item.subtotal = price * item.quantity;
      }
    }

    this.calculateCart(cart);
  }

  private calculateCart(cart: CartDocument): void {
    const subtotal = cart.items.reduce((sum, item) => sum + item.subtotal, 0);
    cart.subtotal = subtotal;

    if (cart.couponCode && cart.discount > 0) {
      cart.total = Math.max(0, subtotal - cart.discount + cart.deliveryFee);
    } else {
      cart.total = subtotal + cart.deliveryFee;
    }
  }
}
