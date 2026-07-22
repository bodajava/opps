import { PricingService } from '../pricing.service';

describe('PricingService', () => {
  let service: PricingService;

  beforeEach(() => {
    service = new PricingService();
  });

  it('single item quantity 1', () => {
    const result = service.calculate({
      items: [{ unitPrice: 100, quantity: 1 }],
      discount: 0,
      deliveryFee: 30,
    });
    expect(result.subtotal).toBe(100);
    expect(result.items[0].totalPrice).toBe(100);
    expect(result.deliveryFee).toBe(30);
    expect(result.total).toBe(130);
  });

  it('single item quantity 2', () => {
    const result = service.calculate({
      items: [{ unitPrice: 120, quantity: 2 }],
      discount: 0,
      deliveryFee: 30,
    });
    expect(result.subtotal).toBe(240);
    expect(result.items[0].totalPrice).toBe(240);
    expect(result.total).toBe(270);
  });

  it('multiple cart items', () => {
    const result = service.calculate({
      items: [
        { unitPrice: 100, quantity: 2 },
        { unitPrice: 50, quantity: 3 },
      ],
      discount: 0,
      deliveryFee: 30,
    });
    expect(result.subtotal).toBe(350);
    expect(result.items[0].totalPrice).toBe(200);
    expect(result.items[1].totalPrice).toBe(150);
    expect(result.total).toBe(380);
  });

  it('product variant price', () => {
    const result = service.calculate({
      items: [{ unitPrice: 150, quantity: 1 }],
      discount: 0,
      deliveryFee: 30,
    });
    expect(result.subtotal).toBe(150);
    expect(result.items[0].unitPrice).toBe(150);
    expect(result.total).toBe(180);
  });

  it('sale price used when available', () => {
    const result = service.calculate({
      items: [{ unitPrice: 80, quantity: 2 }],
      discount: 0,
      deliveryFee: 30,
    });
    expect(result.subtotal).toBe(160);
    expect(result.total).toBe(190);
  });

  it('percentage coupon discount', () => {
    const result = service.calculate({
      items: [{ unitPrice: 100, quantity: 2 }],
      discount: 20,
      deliveryFee: 30,
    });
    expect(result.subtotal).toBe(200);
    expect(result.discount).toBe(20);
    expect(result.total).toBe(210);
  });

  it('fixed coupon discount', () => {
    const result = service.calculate({
      items: [{ unitPrice: 100, quantity: 2 }],
      discount: 50,
      deliveryFee: 30,
    });
    expect(result.subtotal).toBe(200);
    expect(result.discount).toBe(50);
    expect(result.total).toBe(180);
  });

  it('maximum coupon discount does not make total negative', () => {
    const result = service.calculate({
      items: [{ unitPrice: 10, quantity: 1 }],
      discount: 100,
      deliveryFee: 30,
    });
    expect(result.total).toBe(0);
  });

  it('delivery fee added to total', () => {
    const result = service.calculate({
      items: [{ unitPrice: 100, quantity: 1 }],
      discount: 0,
      deliveryFee: 50,
    });
    expect(result.subtotal).toBe(100);
    expect(result.deliveryFee).toBe(50);
    expect(result.total).toBe(150);
  });

  it('free delivery (fee = 0)', () => {
    const result = service.calculate({
      items: [{ unitPrice: 100, quantity: 1 }],
      discount: 0,
      deliveryFee: 0,
    });
    expect(result.deliveryFee).toBe(0);
    expect(result.total).toBe(100);
  });

  it('uses integer minor units to avoid floating point', () => {
    const result = service.calculate({
      items: [{ unitPrice: 24050, quantity: 2 }],
      discount: 0,
      deliveryFee: 3000,
    });
    expect(result.subtotal).toBe(48100);
    expect(result.deliveryFee).toBe(3000);
    expect(result.total).toBe(51100);
  });
});
