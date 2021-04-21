import * as querystring from 'querystring'
import * as fetchPonyfill from 'fetch-ponyfill'
import { v4 } from 'uuid'

const { fetch } = fetchPonyfill() as { fetch: typeof window.fetch }

const toQueryString = (obj: any): string => {
	if (!Object.keys(obj).length) {
		return ''
	}
	return '?' + querystring.stringify(obj)
}

export type Headers = {
	[index: string]: string
}

export type ParsedResponseBody = {
	json?: Record<string, any>
	text?: string
}

export class RestClient {
	headers: Headers = {
		Accept: 'application/json',
	}
	endpoint = ''

	response: {
		headers: Headers
		statusCode: number
		body: unknown
	} = {
		headers: {},
		statusCode: -1,
		body: '',
	}

	debugLog
	errorLog
	parseBody

	constructor({
		debugLog,
		errorLog,
		parseBody,
	}: {
		debugLog?: (requestId: string, ...args: any) => void
		errorLog?: (requestId: string, ...args: any) => void
		parseBody?: (response: Response) => Promise<ParsedResponseBody>
	} = {}) {
		this.debugLog = debugLog
		this.errorLog = errorLog
		this.parseBody = parseBody
	}

	async request(
		method: string,
		path: string,
		queryString?: { [key: string]: string },
		extraHeaders?: Headers,
		body?: unknown,
	): Promise<string> {
		const requestId = v4()
		const headers: Headers = {
			...this.headers,
			...extraHeaders,
		}
		const url = path.startsWith('http')
			? path
			: `${this.endpoint.replace(/\/+$/, '')}/${path.replace(
					/^\/+/,
					'',
			  )}${toQueryString(queryString ?? {})}`
		const options = {
			method,
			headers,
			body:
				body !== undefined
					? typeof body !== 'string'
						? JSON.stringify(body)
						: body
					: undefined,
		}
		this.debugLog?.(requestId, {
			request: {
				url,
				options,
			},
		})
		const res = await fetch(url, options)
		const statusCode: number = res.status
		const h: Headers = {}
		res.headers.forEach((v: string, k: string) => {
			h[k] = v
		})
		const contentType: string = res.headers.get('content-type') ?? ''
		const mediaType: string = contentType.split(';')[0]

		const { text, json } = await (
			this.parseBody ??
			(async (res): Promise<ParsedResponseBody> => {
				const contentLength = +(res.headers.get('content-length') ?? 0)
				if (contentLength === 0) return {}
				const text = await res.text()
				return {
					text,
					json: (() => {
						try {
							return JSON.parse(text)
						} catch {
							return undefined
						}
					})(),
				}
			})
		)(res)

		if (!headers.Accept.includes(mediaType)) {
			const errorMessage = `The content-type "${contentType}" of the response does not match accepted media-type ${headers.Accept}`
			this.errorLog?.(requestId, {
				error: errorMessage,
				statusCode,
				headers: h,
				body: text,
			})
			throw new Error(errorMessage)
		}

		if (/^application\/([^ /]+\+)?json$/.test(mediaType) === false) {
			const errorMessage = `The content-type "${contentType}" of the response is not JSON!`
			this.errorLog?.(requestId, {
				error: errorMessage,
				statusCode,
				headers: h,
				body: text,
			})
			throw new Error(errorMessage)
		}

		this.response = {
			statusCode,
			headers: h,
			body: json,
		}
		this.debugLog?.(requestId, {
			response: {
				...this.response,
			},
		})
		return url
	}
}
