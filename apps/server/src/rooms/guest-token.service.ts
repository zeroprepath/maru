import { RoomId } from '@maru/shared-types';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';

export interface GuestTokenPayload {
  roomId: RoomId;
  jti: string;
}

const SECRET = resolveSecret();

function resolveSecret(): string {
  const fromEnv = process.env.GUEST_TOKEN_SECRET;
  if (fromEnv) return fromEnv;
  // 소스에 적힌 기본값은 공개 저장소에서 누구나 볼 수 있으므로 운영에선 쓰지 않는다
  if (process.env.NODE_ENV === 'production') {
    throw new Error('GUEST_TOKEN_SECRET 환경변수가 필요합니다.');
  }
  return 'dev-only-secret';
}

@Injectable()
export class GuestTokenService {
  sign(roomId: RoomId): string {
    const payload: GuestTokenPayload = { roomId, jti: randomUUID() };
    return jwt.sign(payload, SECRET, { algorithm: 'HS256', expiresIn: '10m' });
  }

  verify(token: string): GuestTokenPayload {
    const decoded = jwt.verify(token, SECRET, { algorithms: ['HS256'] });

    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      typeof (decoded as Record<string, unknown>).roomId !== 'string' ||
      typeof (decoded as Record<string, unknown>).jti !== 'string'
    ) {
      throw new Error('게스트 토큰 페이로드 형식이 아닙니다.');
    }
    return decoded as GuestTokenPayload;
  }
}
