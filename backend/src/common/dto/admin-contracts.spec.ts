import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CategorySortField,
  QueryCategoriesDto,
} from '../../categories/dto/query-categories.dto';
import {
  InventoryStatusFilter,
  QueryInventoryDto,
} from '../../inventory/dto/query-inventory.dto';
import { SortOrder } from './pagination.dto';

describe('admin query contracts', () => {
  it('transforms and validates the categories pagination contract', async () => {
    const dto = plainToInstance(QueryCategoriesDto, {
      page: '2',
      limit: '25',
      sort: CategorySortField.NAME,
      order: SortOrder.ASC,
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(25);
  });

  it('rejects categories limits above the server maximum', async () => {
    const dto = plainToInstance(QueryCategoriesDto, { limit: '101' });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('rejects malformed category parent identifiers', async () => {
    const dto = plainToInstance(QueryCategoriesDto, { parent: 'not-an-id' });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('transforms and validates the inventory filter contract', async () => {
    const dto = plainToInstance(QueryInventoryDto, {
      page: '1',
      limit: '20',
      status: InventoryStatusFilter.LOW_STOCK,
      lowStock: 'true',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.lowStock).toBe(true);
  });

  it('rejects unsupported inventory status values', async () => {
    const dto = plainToInstance(QueryInventoryDto, { status: 'all_stock' });
    expect(await validate(dto)).not.toHaveLength(0);
  });
});
