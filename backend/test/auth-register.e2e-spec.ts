import { Test as NestTest, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import supertest from 'supertest';
import { Model } from 'mongoose';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { EmailService } from '../src/common/providers/email.service';
import { User, UserDocument } from '../src/users/schemas/user.schema';
import {
  EmailOtp,
  EmailOtpDocument,
} from '../src/email-verification/schemas/email-otp.schema';

describe('Auth registration (E2E)', () => {
  const suffix = `${process.pid}-${Date.now()}`;
  const emailPrefix = `e2e-register-${suffix}`;
  const validPassword = 'StrongPass123';
  let app: INestApplication;
  let httpClient: ReturnType<typeof supertest>;
  let userModel: Model<UserDocument>;
  let emailOtpModel: Model<EmailOtpDocument>;
  const sendOTP = jest.fn<Promise<void>, [string, string]>();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await NestTest.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue({
        sendOTP,
        sendWelcome: jest.fn().mockResolvedValue(undefined),
        sendPasswordReset: jest.fn().mockResolvedValue(undefined),
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
    userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
    emailOtpModel = app.get<Model<EmailOtpDocument>>(
      getModelToken(EmailOtp.name),
    );
  }, 30000);

  afterAll(async () => {
    await userModel.deleteMany({ email: { $regex: `^${emailPrefix}` } });
    await emailOtpModel.deleteMany({ email: { $regex: `^${emailPrefix}` } });
    if (app) await app.close();
  });

  beforeEach(() => {
    sendOTP.mockReset();
    sendOTP.mockResolvedValue(undefined);
  });

  function validPayload(email: string) {
    return {
      fullName: 'Register E2E User',
      email,
      phone: '01012345678',
      password: validPassword,
    };
  }

  it('registers pending, verifies email, and only then permits login', async () => {
    const email = `${emailPrefix}-success@example.test`;

    const registerRes = await httpClient
      .post('/api/auth/register')
      .send(validPayload(email))
      .expect(201);

    expect(registerRes.body.data.status).toBe('pending_verification');
    expect(registerRes.body.data.accessToken).toBeUndefined();
    expect(sendOTP).toHaveBeenCalledTimes(1);
    expect(sendOTP.mock.calls[0][0]).toBe(email);

    const verificationRes = await httpClient
      .post('/api/auth/registration/verify')
      .send({
        verificationFlowId: registerRes.body.data.verificationFlowId,
        otp: sendOTP.mock.calls[0][1],
      })
      .expect(200);

    expect(verificationRes.body.data.status).toBe('verified_authenticated');
    expect(verificationRes.body.data.accessToken).toBeTruthy();

    const loginRes = await httpClient
      .post('/api/auth/login')
      .send({ email, password: validPassword })
      .expect(200);

    expect(loginRes.body.data.accessToken).toBeTruthy();
  });

  it('returns a non-enumerating pending response for duplicate email', async () => {
    const email = `${emailPrefix}-duplicate@example.test`;
    await httpClient.post('/api/auth/register').send(validPayload(email));

    const duplicateRes = await httpClient
      .post('/api/auth/register')
      .send(validPayload(email))
      .expect(201);

    expect(duplicateRes.body.data.status).toBe('pending_verification');
    expect(duplicateRes.body.data.accessToken).toBeUndefined();
  });

  it('validates Egyptian phone format', async () => {
    const res = await httpClient
      .post('/api/auth/register')
      .send({
        ...validPayload(`${emailPrefix}-phone@example.test`),
        phone: '1234567890',
      })
      .expect(400);

    expect(res.body.message).toBe(
      'Please provide a valid Egyptian phone number',
    );
  });

  it('validates password policy', async () => {
    const res = await httpClient
      .post('/api/auth/register')
      .send({
        ...validPayload(`${emailPrefix}-password@example.test`),
        password: 'weakpass1',
      })
      .expect(400);

    expect(res.body.message).toBe(
      'Password must contain at least one uppercase letter',
    );
  });

  it('leaves an undelivered account pending without issuing a session', async () => {
    const email = `${emailPrefix}-smtp@example.test`;
    sendOTP.mockRejectedValueOnce(new Error('transport unavailable'));

    const res = await httpClient
      .post('/api/auth/register')
      .send(validPayload(email))
      .expect(503);

    expect(res.body.message).toBe(
      'Verification email could not be sent. Please try again later.',
    );
    await expect(userModel.findOne({ email })).resolves.toMatchObject({
      accountStatus: 'pending_verification',
    });
  });
});
