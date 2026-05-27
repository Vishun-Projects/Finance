const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

/**
 * Normalize env URL values that may or may not include a protocol.
 */
export function normalizeBaseUrl(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/\/$/, '');
  if (!trimmed) return null;
  if (ABSOLUTE_URL_REGEX.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Resolve the Python bank-statement parser endpoint.
 *
 * Local dev: FastAPI on http://127.0.0.1:8000/api/parser
 * Vercel:    https://<deployment>/api/py_parser
 *
 * Override anytime with PYTHON_PARSER_URL (full URL including path).
 */
export function getPythonParserUrl(): string {
  const explicit = process.env.PYTHON_PARSER_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  const onVercel = process.env.VERCEL === '1' && Boolean(process.env.VERCEL_URL);

  if (onVercel) {
    const base =
      normalizeBaseUrl(process.env.VERCEL_URL) ||
      normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ||
      normalizeBaseUrl(process.env.APP_URL);

    if (!base) {
      throw new Error('Missing VERCEL_URL or NEXT_PUBLIC_APP_URL for Python parser on Vercel');
    }

    return `${base}/api/py_parser`;
  }

  const localBase =
    normalizeBaseUrl(process.env.PYTHON_PARSER_LOCAL_URL) ||
    'http://127.0.0.1:8000';

  return `${localBase}/api/parser`;
}

export interface PythonParserPayload {
  pdf_data: string;
  bank: string;
  bank_profiles: unknown[];
  password: string;
}

export async function callPythonParser(payload: PythonParserPayload): Promise<{
  success: boolean;
  data?: unknown;
  error?: string;
}> {
  const pythonFunctionUrl = getPythonParserUrl();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    headers['x-vercel-protection-bypass'] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  }

  const response = await fetch(pythonFunctionUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      type: 'pdf',
      payload,
    }),
  });

  if (response.ok) {
    const data = await response.json();
    if (data.statusCode && data.body) {
      try {
        const parsedBody = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
        if (data.statusCode === 200) {
          return { success: true, data: parsedBody };
        }
        return { success: false, error: parsedBody.error || 'Python parser failed' };
      } catch {
        return { success: false, error: data.body || 'Failed to parse Python response' };
      }
    }
    return { success: true, data };
  }

  const errorText = await response.text();
  let errorMessage = errorText;
  try {
    const errorJson = JSON.parse(errorText);
    errorMessage = errorJson.error || errorJson.message || errorText;
  } catch {
    // Not JSON
  }

  return { success: false, error: errorMessage };
}
