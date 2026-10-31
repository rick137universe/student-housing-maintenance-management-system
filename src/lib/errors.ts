export class AppError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export function requireValue(value: unknown, message: string, status = 409): asserts value {
  if (!value) throw new AppError(status, status === 404 ? 'NOT_FOUND' : 'CONFLICT', message);
}
