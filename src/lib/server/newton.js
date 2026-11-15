import { ATAI_API_KEY, ATAI_API_ENDPOINT } from '$env/static/private';

// Newton C 2.6 on the Inference API.
const MODEL = 'newton-c-2.6';
const DEFAULT_TIMEOUT_MS = 60000;

function apiUrl(path) {
	const root = ATAI_API_ENDPOINT.replace(/\/$/, '').replace(/\/api$/, '');
	return `${root}/api${path}`;
}

/**
 * Send a text query to Newton C 2.6 through the Inference API's
 * POST /api/inference/query (stateless, no session).
 *
 * @param {Object} args
 * @param {string} args.query - User prompt.
 * @param {string} [args.systemPrompt] - System prompt.
 * @param {number} [args.maxNewTokens=512]
 * @param {number} [args.timeoutMs=60000]
 * @returns {Promise<string>} The model's text response.
 */
export async function runQuery({
	query,
	systemPrompt = '',
	maxNewTokens = 512,
	timeoutMs = DEFAULT_TIMEOUT_MS
}) {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const res = await fetch(apiUrl('/inference/query'), {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${ATAI_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: MODEL,
				query,
				system_prompt: systemPrompt,
				max_new_tokens: maxNewTokens
			}),
			signal: controller.signal
		});

		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			throw new Error(`POST /api/inference/query failed: ${res.status} — ${JSON.stringify(err)}`);
		}

		const data = await res.json();
		const inner = data?.response;
		if (inner?.success === false) throw new Error(`Model returned success=false: ${JSON.stringify(inner)}`);
		const text = Array.isArray(inner?.response) ? inner.response[0] : inner?.response;
		if (typeof text !== 'string') throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
		return text;
	} finally {
		clearTimeout(timeoutId);
	}
}
