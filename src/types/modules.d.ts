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
}

declare module 'pg' {
  export class Pool {
    constructor(config?: { connectionString?: string; max?: number });
    end(): Promise<void>;
  }
}
