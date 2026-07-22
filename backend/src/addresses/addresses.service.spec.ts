import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AddressesService } from './addresses.service';
import { Address } from './schemas/address.schema';

describe('AddressesService', () => {
  let service: AddressesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddressesService,
        { provide: getModelToken(Address.name), useValue: {} },
      ],
    }).compile();

    service = module.get<AddressesService>(AddressesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
