import type { ApiError } from '@/shared/contracts';

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: init?.body
      ? { 'Content-Type': 'application/json', ...init.headers }
      : init?.headers,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiError | null;
    throw new Error(body?.message ?? 'Request failed.');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
