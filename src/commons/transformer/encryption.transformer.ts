import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { ValueTransformer } from 'typeorm';
import * as dotenv from 'dotenv';

// .env 파일 로드 (ConfigModule보다 먼저 실행되도록)
dotenv.config();

const SUPPORTED_KEY_LENGTH = 32;
const IV_LENGTH = 12;

const resolveKey = (): Buffer => {
  const rawKey = process.env.DATA_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error(
      'DATA_ENCRYPTION_KEY is not defined. Set a 32-byte key (base64, hex, or utf8).',
    );
  }

  const candidates = [
    Buffer.from(rawKey, 'base64'),
    Buffer.from(rawKey, 'hex'),
    Buffer.from(rawKey, 'utf8'),
  ].filter((buf) => buf.length === SUPPORTED_KEY_LENGTH);

  if (!candidates.length) {
    throw new Error(
      'DATA_ENCRYPTION_KEY must resolve to 32 bytes when decoded from base64, hex, or utf8.',
    );
  }

  return candidates[0];
};

const encryptionKey = resolveKey();

export class EncryptionTransformer implements ValueTransformer {
  to(value: string | Date | null | undefined): string | null | undefined {
    if (value === null || value === undefined) return value as null | undefined;

    // Date 객체인 경우 ISO 문자열로 변환
    let stringValue: string;
    if (value instanceof Date) {
      // Invalid Date 체크
      if (isNaN(value.getTime())) {
        throw new Error('Invalid Date object passed to EncryptionTransformer');
      }
      stringValue = value.toISOString();
    } else if (typeof value === 'string') {
      stringValue = value;
    } else {
      // 다른 타입도 문자열로 변환 시도
      stringValue = String(value);
    }

    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(stringValue, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  from(value: string | null | undefined): any {
    if (!value) return value;

    const payload = Buffer.from(value, 'base64');
    const iv = payload.subarray(0, IV_LENGTH);
    const tag = payload.subarray(IV_LENGTH, IV_LENGTH + 16);
    const ciphertext = payload.subarray(IV_LENGTH + 16);

    const decipher = createDecipheriv(
      'aes-256-gcm',
      encryptionKey,
      Buffer.from(iv),
    );
    decipher.setAuthTag(Buffer.from(tag));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(ciphertext)),
      decipher.final(),
    ]);

    const decryptedString = decrypted.toString('utf8');

    // 항상 문자열로 반환 (TypeORM이 Date 필드에 대해 자동으로 변환)
    // Date 객체를 반환하면 transformer와 TypeORM의 Date 처리 간 충돌 발생
    return decryptedString;
  }
}

export const encryptionTransformer = new EncryptionTransformer();
