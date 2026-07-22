export type PrimitiveSettingValue = string | number | boolean | null;

export type SettingValue =
  | PrimitiveSettingValue
  | PrimitiveSettingValue[]
  | Record<string, PrimitiveSettingValue>
  | Record<string, PrimitiveSettingValue[]>;
