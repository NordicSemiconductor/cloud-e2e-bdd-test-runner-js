import * as querystring from 'querystring'
import * as fetchPonyfill from 'fetch-ponyfill'
import { v4 } from 'uuid'

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
	getResponseStatusCode
	getResponseContentType
	getResponseContentLength

	constructor({
		debugLog,
		errorLog,
		getResponseStatusCode,
		getResponseContentType,
		getResponseContentLength,
	}: {
		debugLog?: (requestId: string, ...args: any) => void
		errorLog?: (requestId: string, ...args: any) => void
		getResponseStatusCode?: (response: any) => number
		getResponseContentType?: (response: any) => string
		getResponseContentLength?: (response: any) => number
	} = {}) {
		this.debugLog = debugLog
		this.errorLog = errorLog
		this.getResponseStatusCode = getResponseStatusCode
		this.getResponseContentType = getResponseContentType
		this.getResponseContentLength = getResponseContentLength
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
		const statusCode: number = (
			this.getResponseStatusCode ?? ((res: any) => res.status)
		)(res)
		const h: Headers = {}
		res.headers.forEach((v: string, k: string) => {
			h[k] = v
		})
		const contentType: string = (
			this.getResponseContentType ??
			((res: any) => res.headers.get('content-type') ?? '')
		)(res)
		const mediaType: string = contentType.split(';')[0]
		if (!headers.Accept.includes(mediaType)) {
			const errorMessage = `The content-type "${contentType}" of the response does not match accepted media-type ${headers.Accept}`
			this.errorLog?.(requestId, {
				error: errorMessage,
				statusCode,
				headers: h,
				body: await res.text(),
			})
			throw new Error(errorMessage)
		}

		const contentLength: number = (
			this.getResponseContentLength ??
			((res: any) => +(res.headers.get('content-length') ?? 0))
		)(res)

		if (
			contentLength > 0 &&
			/^application\/([^ /]+\+)?json$/.test(mediaType) === false
		) {
			const errorMessage = `The content-type "${contentType}" of the response is not JSON!`
			this.errorLog?.(requestId, {
				error: errorMessage,
				statusCode,
				headers: h,
				body: await res.text(),
			})
			throw new Error(errorMessage)
		}

		this.response = {
			statusCode,
			headers: h,
			body: contentLength ? await res.json() : undefined,
		}
		this.debugLog?.(requestId, {
			response: {
				...this.response,
			},
		})
		return url
	}
}
