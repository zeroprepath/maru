import { Injectable } from '@nestjs/common';
import { createHmac } from 'crypto';

const TTL_SECONDS = 10 * 60;
const SECRET = resolveSecret();

function resolveSecret(): string {
  const fromEnv = process.env.TURN_SECRET;
  if (fromEnv) return fromEnv;
  // 소스에 적힌 기본값은 공개 저장소에서 누구나 볼 수 있으므로 운영에선 쓰지 않는다
  if (process.env.NODE_ENV === 'production') {
    throw new Error('TURN_SECRET 환경변수가 필요합니다.');
  }
  return 'dev-only-turn-secret';
}
const TURN_HOST = process.env.TURN_HOST ?? 'localhost';

export interface TurnCredentials {
  urls: string[];
  username: string;
  credential: string;
}

@Injectable()
export class TurnCredentialsService {
  issue(): TurnCredentials {
    const expiresAt = Math.floor(Date.now() / 1000) + TTL_SECONDS;
    const username = `${expiresAt}:maru`;
    const credential = createHmac('sha1', SECRET)
      .update(username)
      .digest('base64');

    return {
      urls: [`turn:${TURN_HOST}:3478`],
      username,
      credential,
    };
  }
}
