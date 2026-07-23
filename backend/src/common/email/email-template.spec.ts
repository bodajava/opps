import {
  escapeEmailHtml,
  orderEmail,
  passwordResetEmail,
  registrationOtpEmail,
  welcomeEmail,
} from './email-template';

describe('transactional email templates', () => {
  const appUrl = 'https://opps.example';

  it('renders branded OTP HTML and plain text without requiring a name', () => {
    const email = registrationOtpEmail({
      otp: '••••••',
      expiresMinutes: 10,
      appUrl,
    });
    expect(email.subject).toBe('Verify your OPPS account');
    expect(email.html).toContain('#FFF8F0');
    expect(email.html).toContain('#5C3A2E');
    expect(email.text).toContain('expires in 10 minutes');
  });

  it('escapes names and order identifiers to prevent HTML injection', () => {
    const otp = registrationOtpEmail({
      otp: '••••••',
      expiresMinutes: 10,
      appUrl,
      name: '<script>alert(1)</script>',
    });
    const order = orderEmail({
      orderNumber: '<img src=x>',
      total: 125.5,
      appUrl,
    });
    expect(otp.html).not.toContain('<script>');
    expect(order.html).not.toContain('<img src=x>');
    expect(escapeEmailHtml('<b>')).toBe('&lt;b&gt;');
  });

  it('renders an absolute reset button and plain-text alternative', () => {
    const reset = passwordResetEmail({
      resetUrl: 'https://opps.example/reset-password?token=redacted',
      appUrl,
    });
    expect(reset.html).toContain('https://opps.example/reset-password');
    expect(reset.text).toContain('https://opps.example/reset-password');
  });

  it('renders welcome as a separate post-verification template', () => {
    const email = welcomeEmail({ name: 'Mona', appUrl });
    expect(email.subject).toBe('Welcome to OPPS');
    expect(email.html).toContain('/products');
  });
});
