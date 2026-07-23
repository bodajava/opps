import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { UploadsService } from './uploads.service';
import { UploadedAsset } from './schemas/uploaded-asset.schema';

describe('UploadsService', () => {
  let service: UploadsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadsService,
        { provide: getModelToken(UploadedAsset.name), useValue: {} },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('/tmp') },
        },
      ],
    }).compile();

    service = module.get<UploadsService>(UploadsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
