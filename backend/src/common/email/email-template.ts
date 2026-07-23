export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface EmailLayoutInput {
  preheader: string;
  heading: string;
  bodyHtml: string;
  bodyText: string;
  appUrl: string;
  supportEmail?: string;
}

export function escapeEmailHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function layout(input: EmailLayoutInput): { html: string; text: string } {
  const support = input.supportEmail
    ? `<p style="margin:16px 0 0;color:#7A6B5D;font-size:13px">Need help? <a href="mailto:${escapeEmailHtml(input.supportEmail)}" style="color:#5C3A2E">Contact our team</a>.</p>`
    : '';
  const supportText = input.supportEmail
    ? `\nNeed help? ${input.supportEmail}`
    : '';
  return {
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeEmailHtml(input.heading)}</title></head><body style="margin:0;background:#FFF8F0;color:#2D1810;font-family:Arial,'Helvetica Neue',sans-serif"><div style="display:none;max-height:0;overflow:hidden">${escapeEmailHtml(input.preheader)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF8F0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px"><tr><td align="center" style="padding:0 0 22px"><a href="${escapeEmailHtml(input.appUrl)}" style="color:#5C3A2E;font-size:30px;font-weight:800;text-decoration:none;letter-spacing:-1px">opps</a></td></tr><tr><td style="background:#FFFCF8;border:1px solid #E8D5B7;border-radius:18px;padding:36px 32px"><h1 style="margin:0 0 16px;font-size:26px;line-height:1.25;color:#2D1810">${escapeEmailHtml(input.heading)}</h1>${input.bodyHtml}${support}</td></tr><tr><td align="center" style="padding:22px 16px 0;color:#7A6B5D;font-size:12px;line-height:1.6">Freshly made moments from OPPS.<br><a href="${escapeEmailHtml(input.appUrl)}" style="color:#5C3A2E">Visit OPPS</a></td></tr></table></td></tr></table></body></html>`,
    text: `${input.heading}\n\n${input.bodyText}${supportText}\n\nVisit OPPS: ${input.appUrl}`,
  };
}

export function registrationOtpEmail(input: {
  otp: string;
  expiresMinutes: number;
  appUrl: string;
  supportEmail?: string;
  name?: string;
}): RenderedEmail {
  const greeting = input.name
    ? `Hi ${escapeEmailHtml(input.name)},`
    : 'Hi there,';
  const greetingText = input.name ? `Hi ${input.name},` : 'Hi there,';
  const rendered = layout({
    preheader: 'Your OPPS email verification code',
    heading: 'Verify your OPPS account',
    appUrl: input.appUrl,
    supportEmail: input.supportEmail,
    bodyHtml: `<p style="margin:0 0 14px;line-height:1.7">${greeting}</p><p style="margin:0 0 22px;line-height:1.7;color:#4D3A31">Use this code to finish creating your account:</p><div style="margin:0 0 22px;padding:18px;text-align:center;background:#F5EDE0;border:1px solid #E8D5B7;border-radius:12px;color:#5C3A2E;font-family:Courier,monospace;font-size:34px;font-weight:700;letter-spacing:8px">${escapeEmailHtml(input.otp)}</div><p style="margin:0 0 12px;line-height:1.7;color:#4D3A31">This code expires in ${input.expiresMinutes} minutes.</p><p style="margin:0;padding:14px;border-radius:10px;background:#FFF8F0;color:#7A6B5D;font-size:13px;line-height:1.6">For your security, never share this code. If you didn’t request an OPPS account, you can safely ignore this email.</p>`,
    bodyText: `${greetingText}\n\nUse this code to finish creating your account: ${input.otp}\n\nThis code expires in ${input.expiresMinutes} minutes. Never share this code. If you did not request an OPPS account, ignore this email.`,
  });
  return { subject: 'Verify your OPPS account', ...rendered };
}

export function passwordResetEmail(input: {
  resetUrl: string;
  appUrl: string;
  supportEmail?: string;
}): RenderedEmail {
  const safeUrl = escapeEmailHtml(input.resetUrl);
  const rendered = layout({
    preheader: 'Reset your OPPS password',
    heading: 'Reset your password',
    appUrl: input.appUrl,
    supportEmail: input.supportEmail,
    bodyHtml: `<p style="margin:0 0 22px;line-height:1.7;color:#4D3A31">We received a request to reset your OPPS password. This link expires in one hour.</p><p style="margin:0 0 22px"><a href="${safeUrl}" style="display:inline-block;padding:13px 22px;border-radius:10px;background:#5C3A2E;color:#FFF8F0;font-weight:700;text-decoration:none">Choose a new password</a></p><p style="margin:0;color:#7A6B5D;font-size:13px;line-height:1.6">If you didn’t request this, no action is needed.</p>`,
    bodyText: `Reset your password using this link (expires in one hour): ${input.resetUrl}\n\nIf you did not request this, no action is needed.`,
  });
  return { subject: 'Reset your OPPS password', ...rendered };
}

export function welcomeEmail(input: {
  name?: string;
  appUrl: string;
  supportEmail?: string;
}): RenderedEmail {
  const name = input.name ? `, ${input.name}` : '';
  const rendered = layout({
    preheader: 'Your OPPS account is ready',
    heading: `Welcome to OPPS${name}`,
    appUrl: input.appUrl,
    supportEmail: input.supportEmail,
    bodyHtml: `<p style="margin:0 0 22px;line-height:1.7;color:#4D3A31">Your email is verified and your account is ready. Explore our cookies and add your favourites to your cart.</p><p style="margin:0"><a href="${escapeEmailHtml(input.appUrl)}/products" style="display:inline-block;padding:13px 22px;border-radius:10px;background:#5C3A2E;color:#FFF8F0;font-weight:700;text-decoration:none">Explore OPPS cookies</a></p>`,
    bodyText: `Your email is verified and your account is ready. Explore OPPS cookies: ${input.appUrl}/products`,
  });
  return { subject: 'Welcome to OPPS', ...rendered };
}

export function orderEmail(input: {
  orderNumber: string;
  total: number;
  appUrl: string;
  status?: string;
  supportEmail?: string;
}): RenderedEmail {
  const title = input.status
    ? 'Your order has an update'
    : 'Your order is confirmed';
  const status = input.status
    ? `<p style="margin:0 0 16px;line-height:1.7">New status: <strong>${escapeEmailHtml(input.status)}</strong></p>`
    : '';
  const total = input.status
    ? ''
    : `<div style="padding:16px;border-radius:10px;background:#F5EDE0"><span style="color:#7A6B5D">Order total</span><strong style="float:right">EGP ${input.total.toFixed(2)}</strong></div>`;
  const rendered = layout({
    preheader: `${title} — ${input.orderNumber}`,
    heading: title,
    appUrl: input.appUrl,
    supportEmail: input.supportEmail,
    bodyHtml: `<p style="margin:0 0 16px;line-height:1.7">Order <strong>${escapeEmailHtml(input.orderNumber)}</strong></p>${status}${total}`,
    bodyText: `Order ${input.orderNumber}${input.status ? `\nStatus: ${input.status}` : `\nTotal: EGP ${input.total.toFixed(2)}`}`,
  });
  return { subject: `${title} — ${input.orderNumber}`, ...rendered };
}
