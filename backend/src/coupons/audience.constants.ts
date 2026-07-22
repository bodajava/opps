export type AudienceType =
  | 'all'
  | 'new_customers'
  | 'returning'
  | 'high_value'
  | 'inactive'
  | 'specific';

export const AUDIENCE_TYPES: readonly AudienceType[] = [
  'all',
  'new_customers',
  'returning',
  'high_value',
  'inactive',
  'specific',
];

export const ELIGIBLE_ORDER_STATUSES = [
  'confirmed',
  'processing',
  'ready_for_delivery',
  'out_for_delivery',
  'delivered',
];

export const EXCLUDED_ORDER_STATUSES = [
  'pending',
  'cancelled',
  'returned',
  'refunded',
];
