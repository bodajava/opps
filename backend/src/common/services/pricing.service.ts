import { Injectable } from '@nestjs/common';

export interface PricingItem {
  unitPrice: number;
  quantity: number;
}

export interface PricingInput {
  items: PricingItem[];
  discount: number;
  deliveryFee: number;
}

export interface PricingResult {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  items: (PricingItem & { totalPrice: number })[];
}

@Injectable()
export class PricingService {
  calculate(input: PricingInput): PricingResult {
    const items = input.items.map((item) => ({
      ...item,
      totalPrice: item.unitPrice * item.quantity,
    }));
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const total = Math.max(0, subtotal - input.discount + input.deliveryFee);
    return {
      items,
      subtotal,
      discount: input.discount,
      deliveryFee: input.deliveryFee,
      total,
    };
  }
}
