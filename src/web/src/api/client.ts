export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler;
}

function errorDetail(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object') {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((entry) => {
          if (entry && typeof entry === 'object' && 'msg' in entry) {
            return String((entry as { msg: unknown }).msg);
          }
          return String(entry);
        })
        .join(', ');
    }
  }
  return fallback;
}

async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  let body: BodyInit | undefined;

  if (options.body !== undefined) {
    if (
      options.body instanceof FormData ||
      options.body instanceof Blob ||
      options.body instanceof URLSearchParams ||
      typeof options.body === 'string'
    ) {
      body = options.body as BodyInit;
    } else {
      headers.set('content-type', 'application/json');
      body = JSON.stringify(options.body);
    }
  }
  if (!headers.has('accept')) headers.set('accept', 'application/json');

  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      body,
      headers,
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError(0, 'Netzwerkfehler: Der BFF ist nicht erreichbar.');
  }

  if (response.status === 401 && !path.startsWith('/auth/login')) {
    unauthorizedHandler?.();
  }

  if (!response.ok) {
    const contentType = response.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : await response.text().catch(() => '');
    throw new ApiError(
      response.status,
      errorDetail(payload, `Anfrage fehlgeschlagen (HTTP ${response.status}).`),
    );
  }

  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }
  return (await response.text()) as T;
}

export function apiGet<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  return request<T>(path, { ...options, method: 'GET' });
}

export function apiPost<T>(path: string, body?: unknown, options: ApiRequestOptions = {}): Promise<T> {
  return request<T>(path, { ...options, method: 'POST', body });
}

export function apiPut<T>(path: string, body?: unknown, options: ApiRequestOptions = {}): Promise<T> {
  return request<T>(path, { ...options, method: 'PUT', body });
}

export function apiDelete<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  return request<T>(path, { ...options, method: 'DELETE' });
}

export async function downloadFile(path: string, filename: string): Promise<void> {
  const response = await fetch(path, { credentials: 'same-origin' });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      errorDetail(payload, `Download fehlgeschlagen (HTTP ${response.status}).`),
    );
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
