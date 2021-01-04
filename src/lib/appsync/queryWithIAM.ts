import { SignatureV4 } from '@aws-sdk/signature-v4'
import { Credentials, Endpoint } from '@aws-sdk/types'
import { HttpRequest } from '@aws-sdk/protocol-http'
import fetch from 'node-fetch'
import { parse } from 'url'
import { parseQuery } from './parseQuery'
import { GQLQueryResult } from '../gql-query-result'

export const queryWithIAM = (
	accessKeyId: string,
	secretAccessKey: string,
	sessionToken: string,
	endpoint: string,
) => async (
	gqlQuery: string,
	variables?: { [key: string]: string },
): Promise<GQLQueryResult> => {
	const credentials: Credentials = {
		accessKeyId,
		secretAccessKey,
		sessionToken,
	}
	const { selection, operation } = parseQuery(gqlQuery)
	const graphQLEndpoint = parse(endpoint)
	const region = graphQLEndpoint.host!.split('.')[2]
	const httpRequest = new HttpRequest(
		((p: ReturnType<typeof parse>): Endpoint =>
			({
				...p,
				port: p.port !== null ? parseInt(p.port, 10) : undefined,
			} as Endpoint))(parse(endpoint)),
	)
	const query = {
		query: gqlQuery,
		variables,
	}

	httpRequest.headers.host = graphQLEndpoint.host!
	httpRequest.headers['Content-Type'] = 'application/json'
	httpRequest.method = 'POST'
	// @ts-ignore Signers is not a public API
	httpRequest.region = region
	httpRequest.body = JSON.stringify(query)

	// @ts-ignore Signers is not a public API
	const signer = new SignatureV4(httpRequest, 'appsync', true)
	// @ts-ignore AWS.util is not a public API
	signer.addAuthorization(credentials, new Date())

	const options = {
		method: httpRequest.method,
		body: httpRequest.body,
		headers: httpRequest.headers,
	}

	const response = await fetch(graphQLEndpoint.href, options)
	return {
		operation,
		selection,
		result: await response.json(),
	}
}
