export interface InventoryItemResponseDto {
  productId: string;
  productName: string;
  productImage?: string;
  sku: string;
  currentStock: number;
  lowStockThreshold: number;
  inStock: boolean;
  isActive: boolean;
  lastMovementAt?: string;
}

export interface InventoryListResponseDto {
  items: InventoryItemResponseDto[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
