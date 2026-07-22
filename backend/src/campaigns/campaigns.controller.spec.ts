import { Test, TestingModule } from '@nestjs/testing';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';

describe('CampaignsController', () => {
  let controller: CampaignsController;

  const mockService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    sendCampaign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CampaignsController],
      providers: [{ provide: CampaignsService, useValue: mockService }],
    }).compile();

    controller = module.get<CampaignsController>(CampaignsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('calls findAll with pagination params', async () => {
    mockService.findAll.mockResolvedValue({ items: [], pagination: {} });
    await controller.findAll('1', '10', 'draft', 'test');
    expect(mockService.findAll).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      status: 'draft',
      search: 'test',
    });
  });

  it('calls findById', async () => {
    mockService.findById.mockResolvedValue({ _id: 'c1' });
    await controller.findById('c1');
    expect(mockService.findById).toHaveBeenCalledWith('c1');
  });

  it('calls create', async () => {
    const dto = { name: 'Test', subject: 'Hi', content: '<p>Hi</p>' };
    mockService.create.mockResolvedValue({ _id: 'c1', ...dto });
    await controller.create(dto);
    expect(mockService.create).toHaveBeenCalledWith(dto);
  });

  it('calls update', async () => {
    mockService.update.mockResolvedValue({ _id: 'c1', name: 'Updated' });
    await controller.update('c1', { name: 'Updated' });
    expect(mockService.update).toHaveBeenCalledWith('c1', { name: 'Updated' });
  });

  it('calls delete', async () => {
    mockService.delete.mockResolvedValue({ deleted: true });
    await controller.delete('c1');
    expect(mockService.delete).toHaveBeenCalledWith('c1');
  });

  it('calls send', async () => {
    mockService.sendCampaign.mockResolvedValue({ _id: 'c1', status: 'sent' });
    await controller.send('c1');
    expect(mockService.sendCampaign).toHaveBeenCalledWith('c1');
  });
});
