export interface CategoryResponseDto {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  isActive: boolean;
  sortOrder: number;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryPaginationMetaDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CategoryListResponseDto {
  items: CategoryResponseDto[];
  meta: CategoryPaginationMetaDto;
}
