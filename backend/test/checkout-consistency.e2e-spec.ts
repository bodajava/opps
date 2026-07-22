import { Test as NestTest, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import supertest from 'supertest';
import type { Response } from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { EmailService } from '../src/common/providers/email.service';

describe('Checkout Consistency (E2E)', () => {
  const testEmail = `e2e-checkout+${process.pid}@example.com`;
  let app: INestApplication;
  let productId: string;
  let productPrice: number;
  let httpClient: ReturnType<typeof supertest>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await NestTest.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue({
        sendOTP: jest.fn().mockResolvedValue(undefined),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
    await app.init();
    httpClient = supertest(app.getHttpServer());
  }, 30000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('step 1: fetch a seed product and record price and stock', async () => {
    const res = await httpClient.get('/api/products/featured').expect(200);
    const products = res.body.data;
    expect(Array.isArray(products)).toBe(true);
    expect(products.length).toBeGreaterThan(0);

    const product = products[0];
    productId = product._id;
    productPrice = product.salePrice ?? product.regularPrice;

    expect(productId).toBeDefined();
    expect(typeof productPrice).toBe('number');
    expect(productPrice).toBeGreaterThan(0);
  });

  it('step 2: request checkout quote for qty 2', async () => {
    const res = await httpClient
      .post('/api/checkout/quote')
      .send({
        items: [{ productId, quantity: 2 }],
        governorate: 'Cairo',
        city: 'Nasr City',
      })
      .expect(200);

    const quote = res.body.data;
    expect(quote.subtotal).toBe(productPrice * 2);
    expect(quote.items[0].unitPrice).toBe(productPrice);
    expect(quote.items[0].quantity).toBe(2);
    expect(quote.items[0].totalPrice).toBe(productPrice * 2);
    expect(quote.total).toBe(quote.subtotal + quote.deliveryFee);
  });

  it('step 3: send OTP', async () => {
    const sendRes = await httpClient
      .post('/api/checkout/email/send-otp')
      .send({ email: testEmail, purpose: 'checkout' })
      .expect(200);

    expect(sendRes.body.success).toBe(true);
  });

  it('step 4: attempt to place order without proof fails', async () => {
    const res = await httpClient
      .post('/api/checkout/orders')
      .send({
        customerName: 'E2E Tester',
        customerEmail: testEmail,
        customerPhone: '01000000000',
        shippingAddress: {
          governorate: 'Cairo',
          city: 'Nasr City',
          district: 'Test',
          street: 'Test St',
          buildingNumber: '1',
        },
        items: [{ productId, quantity: 2 }],
        paymentMethod: 'cod',
        verificationProof: 'fake-proof-token',
      })
      .expect(400);

    expect(res.body.message).toContain('Invalid verification proof');
  });

  it('step 5: place order with forged proof fails', async () => {
    await httpClient
      .post('/api/checkout/orders')
      .send({
        customerName: 'E2E Tester',
        customerEmail: testEmail,
        customerPhone: '01000000000',
        shippingAddress: {
          governorate: 'Cairo',
          city: 'Nasr City',
          district: 'Test',
          street: 'Test St',
          buildingNumber: '1',
        },
        items: [{ productId, quantity: 2 }],
        paymentMethod: 'cod',
        verificationProof:
          'eyJqdGkiOiJ0ZXN0LWp0aSIsImVtYWlsIjoiZTJlLWNoZWNrb3V0QHRlc3QuY29tIiwicHVycG9zZSI6ImNoZWNrb3V0X3ZlcmlmaWNhdGlvbiIsImlhdCI6MCwiZXhwIjo5OTk5OTk5OTk5fQ==.test',
      })
      .expect(400);
  });
});
