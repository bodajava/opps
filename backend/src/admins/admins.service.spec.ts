import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { AdminsService } from './admins.service';
import { User } from '../users/schemas/user.schema';
import { Role } from '../roles/schemas/role.schema';

describe('AdminsService', () => {
  let service: AdminsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminsService,
        { provide: getModelToken(User.name), useValue: {} },
        { provide: getModelToken(Role.name), useValue: {} },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(12) },
        },
      ],
    }).compile();

    service = module.get<AdminsService>(AdminsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
