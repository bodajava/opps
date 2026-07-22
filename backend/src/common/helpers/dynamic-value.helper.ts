export function toDynamicRecord(value: DynamicValue): DynamicRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value));
}

export function optionalDynamicRecord(
  value: DynamicValue,
): DynamicRecord | undefined {
  const record = toDynamicRecord(value);
  return Object.keys(record).length > 0 ? record : undefined;
}

export function textValue(value: DynamicValue, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}
