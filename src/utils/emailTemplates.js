/**
 * Small, dependency-free HTML email templates.
 * Kept as plain template strings so there is no build step / MJML compiler needed.
 */

const wrapper = (bodyHtml) => `
  <div style="background:#FAF9F6;padding:40px 16px;font-family:Georgia,'Times New Roman',serif;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e5e2d9;padding:36px 32px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;width:44px;height:44px;background:#0B3D2E;color:#fff;line-height:44px;font-size:20px;font-weight:bold;">V</div>
        <div style="margin-top:10px;letter-spacing:4px;font-size:18px;color:#0B3D2E;font-weight:bold;">VÉRANT</div>
        <div style="font-size:10px;letter-spacing:3px;color:#5A6650;text-transform:uppercase;margin-top:2px;">Maison de Couture</div>
      </div>
      ${bodyHtml}
      <div style="margin-top:32px;padding-top:20px;border-top:1px solid #eee;text-align:center;font-size:11px;color:#999;">
        &copy; ${new Date().getFullYear()} VÉRANT Maison. All rights reserved.
      </div>
    </div>
  </div>
`;

function otpEmailTemplate({ name, otp, minutes }) {
  return wrapper(`
    <p style="font-size:14px;color:#222;">Bonjour ${name || 'there'},</p>
    <p style="font-size:14px;color:#444;line-height:1.6;">
      Use the verification code below to confirm your email address and activate your Maison account.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <span style="display:inline-block;font-size:30px;letter-spacing:10px;font-weight:bold;color:#0B3D2E;background:#F2F0E9;padding:14px 20px;">
        ${otp}
      </span>
    </div>
    <p style="font-size:13px;color:#777;text-align:center;">
      This code expires in ${minutes} minutes. If you did not request this, you can safely ignore this email.
    </p>
  `);
}

function resetPasswordTemplate({ name, otp, minutes }) {
  return wrapper(`
    <p style="font-size:14px;color:#222;">Bonjour ${name || 'there'},</p>
    <p style="font-size:14px;color:#444;line-height:1.6;">
      We received a request to reset your password. Use the code below to continue.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <span style="display:inline-block;font-size:30px;letter-spacing:10px;font-weight:bold;color:#0B3D2E;background:#F2F0E9;padding:14px 20px;">
        ${otp}
      </span>
    </div>
    <p style="font-size:13px;color:#777;text-align:center;">
      This code expires in ${minutes} minutes. If you did not request a password reset, please ignore this email or contact support.
    </p>
  `);
}

function welcomeEmailTemplate({ name }) {
  return wrapper(`
    <p style="font-size:14px;color:#222;">Bonjour ${name || 'there'},</p>
    <p style="font-size:14px;color:#444;line-height:1.6;">
      Your email is verified and your Maison account is now active. Welcome to the Vérant family —
      enjoy complimentary tailoring notes and early access to private drops.
    </p>
  `);
}

function orderConfirmationTemplate({ name, orderId, total, items }) {
  const rows = items
    .map(
      (i) => `
      <tr>
        <td style="padding:8px 0;font-size:13px;color:#333;">${i.name} <span style="color:#999;">× ${i.qty}</span></td>
        <td style="padding:8px 0;font-size:13px;color:#333;text-align:right;">₹${i.price * i.qty}</td>
      </tr>`,
    )
    .join('');

  return wrapper(`
    <p style="font-size:14px;color:#222;">Bonjour ${name || 'there'},</p>
    <p style="font-size:14px;color:#444;line-height:1.6;">
      Thank you for your order. Your Maison pieces are being prepared.
    </p>
    <p style="font-size:13px;color:#0B3D2E;font-weight:bold;letter-spacing:1px;">Order ${orderId}</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      ${rows}
    </table>
    <div style="border-top:1px solid #eee;padding-top:10px;text-align:right;font-size:14px;font-weight:bold;color:#0B3D2E;">
      Total: ₹${total}
    </div>
  `);
}

module.exports = {
  otpEmailTemplate,
  resetPasswordTemplate,
  welcomeEmailTemplate,
  orderConfirmationTemplate,
};
