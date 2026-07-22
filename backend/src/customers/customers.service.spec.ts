import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CustomersService } from './customers.service';
import { User } from '../users/schemas/user.schema';
import { Order } from '../orders/schemas/order.schema';

describe('CustomersService', () => {
  let service: CustomersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: getModelToken(User.name), useValue: {} },
        { provide: getModelToken(Order.name), useValue: {} },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
