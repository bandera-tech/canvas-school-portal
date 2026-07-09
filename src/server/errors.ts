export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

export const notFound = (message = 'The requested resource was not found.') =>
  new AppError(404, 'NOT_FOUND', message);

export const forbidden = (
  message = 'You do not have access to this resource.'
) => new AppError(403, 'FORBIDDEN', message);

export const conflict = (message: string) =>
  new AppError(409, 'CONFLICT', message);
