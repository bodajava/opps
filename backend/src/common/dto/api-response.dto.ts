import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiResponse<T = DynamicValue> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Operation successful' })
  message: string;

  data: T;

  @ApiProperty({ example: '2026-07-13T12:00:00.000Z' })
  timestamp: string;

  constructor(partial: Partial<ApiResponse<T>>) {
    Object.assign(this, partial);
  }
}

export class PaginatedResponse<T = DynamicValue> extends ApiResponse<T[]> {
  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;

  @ApiPropertyOptional()
  hasNextPage?: boolean;

  @ApiPropertyOptional()
  hasPreviousPage?: boolean;

  constructor(partial: Partial<PaginatedResponse<T>>) {
    super(partial);
    Object.assign(this, partial);
  }
}

export class ApiError {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'Validation failed' })
  message: string;

  @ApiPropertyOptional({ example: ['email must be an email'] })
  errors?: string[];

  @ApiProperty({ example: '2026-07-13T12:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/api/example' })
  path: string;
}
