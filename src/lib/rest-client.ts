import * as querystring from 'querystring'
import * as fetchPonyfill from 'fetch-ponyfill'

const { fetch } = fetchPonyfill()

const toQueryString = (obj: any): string => {
	if (!Object.keys(obj).length) {
		return ''
	}
	return '?' + querystring.stringify(obj)
}

export type Headers = {
	[index: string]: string
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

	constructor({
		debugLog,
		errorLog,
	}: {
		debugLog?: (...args: any) => void
		errorLog?: (...args: any) => void
	} = {}) {
		this.debugLog = debugLog
		this.errorLog = errorLog
	}

	async request(
		method: string,
		path: string,
		queryString?: { [key: string]: string },
		extraHeaders?: Headers,
		body?: unknown,
	): Promise<string> {
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
		const res = await fetch(url, options)
		const contentType: string = res.headers.get('content-type') ?? '',
			mediaType: string = contentType.split(';')[0]
		if (!headers.Accept.includes(mediaType)) {
			const errorMessage = `The content-type "${contentType}" of the response does not match accepted media-type ${headers.Accept}`
			this.errorLog?.({
				error: errorMessage,
				headers,
				body: await res.text(),
			})
			throw new Error(errorMessage)
		}

		const statusCode: number = res.status
		const contentLength: number = +(res.headers.get('content-length') ?? 0)
		const h: Headers = {}
		res.headers.forEach((v: string, k: string) => {
			h[k] = v
		})

		if (
			contentLength > 0 &&
			/^application\/([^ /]+\+)?json$/.test(mediaType) === false
		) {
			const errorMessage = `The content-type "${contentType}" of the response is not JSON!`
			this.errorLog?.({ error: errorMessage, headers, body: await res.text() })
			throw new Error(errorMessage)
		}

		this.response = {
			statusCode,
			headers: h,
			body: contentLength ? await res.json() : undefined,
		}
		this.debugLog?.({
			request: {
				url,
				options,
			},
			response: {
				...this.response,
			},
		})
		return url
	}
}
