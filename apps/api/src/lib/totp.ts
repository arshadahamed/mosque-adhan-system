import speakeasy from "speakeasy";
import QRCode from "qrcode";

export function generateTotpSecret(email: string) {
  const secret = speakeasy.generateSecret({ name: `Mawaqit (${email})`, length: 20 });
  return { base32: secret.base32 as string, otpauthUrl: secret.otpauth_url as string };
}

export async function totpQrDataUrl(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl);
}

export function verifyTotp(secret: string, token: string): boolean {
  return speakeasy.totp.verify({ secret, encoding: "base32", token, window: 1 });
}
