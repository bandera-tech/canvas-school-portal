declare module 'jsonwebtoken' {
  export interface SignOptions {
    expiresIn?: string | number;
    issuer?: string;
    audience?: string;
  }
  export function sign(
    payload: object,
    secret: string,
    options?: SignOptions
  ): string;
  export function verify(
    token: string,
    secret: string,
    options?: { issuer?: string; audience?: string }
  ): unknown;
  const jwt: {
    sign: typeof sign;
    verify: typeof verify;
  };
  export default jwt;
}

declare module 'pg' {
  export class Pool {
    constructor(config?: { connectionString?: string; max?: number });
    end(): Promise<void>;
  }
}
