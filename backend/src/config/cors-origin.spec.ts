import { isAllowedCorsOrigin } from './cors-origin';

describe('isAllowedCorsOrigin', () => {
  it('allows exact configured origins', () => {
    expect(
      isAllowedCorsOrigin(
        'http://localhost:3000',
        ['http://localhost:3000'],
        'production',
      ),
    ).toBe(true);
  });

  it('allows alternate localhost ports only in development', () => {
    expect(
      isAllowedCorsOrigin(
        'http://localhost:3001',
        ['http://localhost:3000'],
        'development',
      ),
    ).toBe(true);
    expect(
      isAllowedCorsOrigin(
        'http://localhost:3001',
        ['http://localhost:3000'],
        'production',
      ),
    ).toBe(false);
  });

  it('rejects unconfigured remote origins', () => {
    expect(
      isAllowedCorsOrigin(
        'https://example.com',
        ['http://localhost:3000'],
        'development',
      ),
    ).toBe(false);
  });
});
