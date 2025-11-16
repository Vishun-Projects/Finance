import { NextRequest, NextResponse } from 'next/server';

function getBaseUrl() {
	if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
	if (process.env.VERCEL) return `https://${process.env.VERCEL_URL}`;
	return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

export async function POST(request: NextRequest) {
	try {
		const startTs = Date.now();
		const requestId =
			(typeof crypto !== 'undefined' && 'randomUUID' in crypto && (crypto as any).randomUUID?.()) ||
			Math.random().toString(36).slice(2);
		const localDebug: Array<Record<string, any>> = [];
		const mark = (message: string, extra?: Record<string, any>) => {
			localDebug.push({ t: new Date().toISOString(), message, ...(extra || {}) });
		};

		const formData = await request.formData();
		// Accept both 'file' (preferred) and 'pdf' (legacy) fields
		const file = (formData.get('file') as File) || (formData.get('pdf') as File);
		const bankHint = (formData.get('bank') as string | null)?.toUpperCase() || '';

		if (!file) {
			return NextResponse.json({ error: 'No file provided' }, { status: 400 });
		}

		const name = (file.name || '').toLowerCase();
		let fileType = '';
		if (name.endsWith('.pdf')) fileType = '.pdf';
		else if (name.endsWith('.xls')) fileType = '.xls';
		else if (name.endsWith('.xlsx')) fileType = '.xlsx';
		else if (name.endsWith('.doc')) fileType = '.doc';
		else if (name.endsWith('.docx')) fileType = '.docx';
		else if (name.endsWith('.txt')) fileType = '.txt';

		// Convert file to base64
		const bytes = await file.arrayBuffer();
		const buffer = Buffer.from(bytes);
		const base64 = buffer.toString('base64');
		mark('received-file', { name, size: buffer.length, fileType, bankHint, requestId });

		const mode = fileType === '.pdf' ? 'pdf' : fileType ? 'file' : 'auto';
		const payload: Record<string, any> = {
			mode,
			file_data: base64,
			file_type: fileType || undefined,
			requestId,
		};
		if (bankHint) payload.bank = bankHint;

		// Prod: call Python serverless function; Dev: execute same python entrypoint locally
		const isProd = !!process.env.VERCEL;
		if (isProd) {
			const pythonUrl = `${getBaseUrl()}/api/parse-python`;
			mark('calling-python-serverless', { url: pythonUrl });
			const resp = await fetch(pythonUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			if (!resp.ok) {
				const text = await resp.text().catch(() => '');
				mark('python-serverless-error', { status: resp.status, text: text?.slice?.(0, 2000) });
				return NextResponse.json(
					{
						error: 'Parser error',
						requestId,
						details: { env: 'prod', status: resp.status, response: text },
						debug: { logs: localDebug, durationMs: Date.now() - startTs },
					},
					{ status: 500 },
				);
			}
			const data = await resp.json();
			mark('python-serverless-success', { count: data?.count });
			return NextResponse.json({
				success: true,
				transactions: Array.isArray(data?.transactions) ? data.transactions : [],
				count: data?.count ?? (Array.isArray(data?.transactions) ? data.transactions.length : 0),
				metadata: data?.metadata || {},
				bankType: data?.bankType || bankHint || 'UNKNOWN',
				message: data?.message,
				requestId,
				debug: {
					logs: [...(Array.isArray(data?.debug?.logs) ? data.debug.logs : []), ...localDebug],
					durationMs: Date.now() - startTs,
				},
			});
		} else {
			// Dev fallback: execute the same python handler via stdin/stdout for parity
			const { execFile } = await import('child_process');
			const { promisify } = await import('util');
			const execFileAsync = promisify(execFile);
			// Use a small runner that loads api/parse-python/index.py by absolute path
			// to avoid import issues with hyphenated directories.
			const runner = `
import sys, json, os, importlib.util
root = os.getcwd()
py_file = os.path.join(root, 'vishnu-finance', 'api', 'parse-python', 'index.py')
if not os.path.exists(py_file):
    # Fallback for execution from project root
    py_file = os.path.join(root, 'api', 'parse-python', 'index.py')
spec = importlib.util.spec_from_file_location("parse_python_index", py_file)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)  # type: ignore
payload = json.load(sys.stdin)
resp = mod.handler({"body": json.dumps(payload), "isBase64Encoded": False}, None)
body = resp.get("body")
if isinstance(body, (str, bytes)):
    print(body)
else:
    print(json.dumps(body))
`.trim();

			try {
				const interpreter = process.platform === 'win32' ? 'py' : 'python';
				const args = process.platform === 'win32' ? ['-3', '-c', runner] : ['-c', runner];
				mark('exec-python', { interpreter, args });
				const result = await execFileAsync(interpreter, args, {
					env: { ...process.env, PYTHONUNBUFFERED: '1', PYTHONIOENCODING: 'utf-8' },
					maxBuffer: 10 * 1024 * 1024,
					input: JSON.stringify(payload),
				} as any);
				const stdout = result.stdout?.toString?.() || '';
				const stderr = result.stderr?.toString?.() || '';
				mark('python-exit', { stdoutBytes: stdout.length, stderrBytes: stderr.length });
				const parsed = JSON.parse(stdout);
				return NextResponse.json({
					success: true,
					transactions: Array.isArray(parsed?.transactions) ? parsed.transactions : [],
					count: parsed?.count ?? (Array.isArray(parsed?.transactions) ? parsed.transactions.length : 0),
					metadata: parsed?.metadata || {},
					bankType: parsed?.bankType || bankHint || 'UNKNOWN',
					message: parsed?.message,
					requestId,
					debug: {
						logs: [...(Array.isArray(parsed?.debug?.logs) ? parsed.debug.logs : []), ...localDebug],
						durationMs: Date.now() - startTs,
					},
				});
			} catch (err: any) {
				const stderr = err?.stderr || err?.message || 'Python execution failed';
				mark('python-exec-error', { stderr: String(stderr).slice(0, 4000) });
				return NextResponse.json(
					{
						error: 'Parser error (dev)',
						requestId,
						details: {
							env: 'dev',
							stderr: String(stderr),
						},
						debug: { logs: localDebug, durationMs: Date.now() - startTs },
					},
					{ status: 500 },
				);
			}
		}
	} catch (error: any) {
		return NextResponse.json(
			{ error: 'Failed to parse file', details: error?.message || 'Unknown error' },
			{ status: 500 },
		);
	}
}


