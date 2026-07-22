import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Category } from './schemas/category.schema';

describe('CategoriesService', () => {
  let service: CategoriesService;
  const categoryModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    create: jest.fn(),
  };

  const categoryDocument = {
    _id: { toString: () => '507f1f77bcf86cd799439011' },
    name: 'Cookies',
    slug: 'cookies',
    description: 'Fresh cookies',
    image: '/categories/cookies.webp',
    isActive: true,
    sortOrder: 2,
    parent: null,
    createdAt: new Date('2026-07-22T00:00:00.000Z'),
    updatedAt: new Date('2026-07-22T00:01:00.000Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: getModelToken(Category.name), useValue: categoryModel },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns the public category response shape after create', async () => {
    categoryModel.findOne.mockResolvedValue(null);
    categoryModel.create.mockResolvedValue(categoryDocument);

    await expect(
      service.create({ name: 'Cookies', description: 'Fresh cookies' }),
    ).resolves.toEqual({
      id: '507f1f77bcf86cd799439011',
      name: 'Cookies',
      slug: 'cookies',
      description: 'Fresh cookies',
      image: '/categories/cookies.webp',
      isActive: true,
      sortOrder: 2,
      parentId: undefined,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:01:00.000Z',
    });
  });

  it('rejects duplicate category names on create', async () => {
    categoryModel.findOne.mockResolvedValue(categoryDocument);

    await expect(service.create({ name: 'Cookies' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('returns the public category response shape after update', async () => {
    categoryModel.findById.mockResolvedValue(categoryDocument);
    categoryModel.findOne.mockResolvedValue(null);
    categoryModel.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        ...categoryDocument,
        name: 'Cookies Updated',
        slug: 'cookies-updated',
      }),
    });

    await expect(
      service.update('507f1f77bcf86cd799439011', {
        name: 'Cookies Updated',
      }),
    ).resolves.toMatchObject({
      id: '507f1f77bcf86cd799439011',
      name: 'Cookies Updated',
      slug: 'cookies-updated',
    });
  });

  it('throws not found when updating a missing category', async () => {
    categoryModel.findById.mockResolvedValue(null);

    await expect(
      service.update('507f1f77bcf86cd799439011', { name: 'Missing' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
