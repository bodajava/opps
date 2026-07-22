export const v4 = () => '00000000-0000-0000-0000-000000000000';
export const v1 = () => '00000000-0000-0000-0000-000000000000';
export const v3 = () => '00000000-0000-0000-0000-000000000000';
export const v5 = () => '00000000-0000-0000-0000-000000000000';
export const v6 = () => '00000000-0000-0000-0000-000000000000';
export const v7 = () => '00000000-0000-0000-0000-000000000000';
export const NIL = '00000000-0000-0000-0000-000000000000';
export const MAX = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
export const validate = (u: DynamicValue): u is string => typeof u === 'string';
export const version = () => 4;
export const stringify = (_buf: Uint8Array, _offset?: number): string =>
  '00000000-0000-0000-0000-000000000000';
export const parse = (_uuid: string): Uint8Array => new Uint8Array(16);
export default {
  v4,
  v1,
  v3,
  v5,
  v6,
  v7,
  NIL,
  MAX,
  validate,
  version,
  stringify,
  parse,
};
