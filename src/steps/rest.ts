import * as jsonata from 'jsonata'
import * as chai from 'chai'
import { RestClient } from '../lib/rest-client'
import { expect } from 'chai'
import { regexMatcher } from '../lib/regexMatcher'
import { InterpolatedStep, StepRunnerFunc, Store } from '../lib/runner'
import * as chaiSubset from 'chai-subset'

chai.use(chaiSubset)

export const restStepRunners = (
	{ client }: { client: RestClient } = { client: new RestClient() },
): ((step: InterpolatedStep) => false | StepRunnerFunc<Store>)[] => [
	regexMatcher(/^the ([^ ]+) header is "([^"]+)"$/)(async ([name, value]) => {
		client.headers[name] = value
	}),
	regexMatcher(/^the ([^ ]+) header is "([^"]+)"$/)(async ([name, value]) => {
		client.headers[name] = value
	}),
	regexMatcher(/^the endpoint is "([^"]+)"$/)(async ([endpoint]) => {
		client.endpoint = endpoint
	}),
	regexMatcher(/^I (GET|PUT|POST|PATCH|DELETE) (?:to )?([^ ]+)$/)(
		async ([method, path]) => {
			return client.request(method, path)
		},
	),
	regexMatcher(/^I GET ([^ ]+) with this query$/)(async ([path], step) => {
		if (step.interpolatedArgument === undefined) {
			throw new Error('Must provide argument!')
		}
		const j = JSON.parse(step.interpolatedArgument)
		return client.request('GET', path, j)
	}),
	regexMatcher(/^the response status code should be ([0-9]+)$/)(
		async ([statusCode]) => {
			expect(client.response.statusCode).to.equal(+statusCode)
			return client.response.statusCode
		},
	),
	regexMatcher(/^the response ([^ ]+) should be "([^"]+)"$/)(
		async ([name, value]) => {
			expect(client.response.headers).to.have.property(name.toLowerCase())
			expect(client.response.headers[name.toLowerCase()]).to.equal(value)
			return client.response.headers[name.toLowerCase()]
		},
	),
	regexMatcher(/^the response should (equal|match) this JSON$/)(
		async ([equalOrMatch], step) => {
			if (step.interpolatedArgument === undefined) {
				throw new Error('Must provide argument!')
			}
			const j = JSON.parse(step.interpolatedArgument)
			if (equalOrMatch === 'match') {
				expect(client.response.body).to.containSubset(j)
			} else {
				expect(client.response.body).to.deep.equal(j)
			}
			return client.response.body
		},
	),
	regexMatcher(/^the response (?:body )should equal this payload$/)(
		async (_, step) => {
			if (step.interpolatedArgument === undefined) {
				throw new Error('Must provide argument!')
			}
			expect(client.response.body).to.equal(step.interpolatedArgument.trim())
			return client.response.body
		},
	),
	regexMatcher(/^"([^"]+)" of the response body is not empty$/)(
		async ([exp]) => {
			const e = jsonata(exp)
			const v = e.evaluate(client.response.body)
			expect(v).to.not.be.an('undefined')
			return v
		},
	),
	regexMatcher(/^"([^"]+)" of the response body should equal "([^"]+)"$/)(
		async ([exp, expected]) => {
			const e = jsonata(exp)
			const v = e.evaluate(client.response.body)
			expect(v).to.equal(expected)
			return v
		},
	),
	regexMatcher(/^"([^"]+)" of the response body should equal ([0-9]+)$/)(
		async ([exp, expected]) => {
			const e = jsonata(exp)
			const v = e.evaluate(client.response.body)
			expect(v).to.equal(+expected)
			return v
		},
	),
	regexMatcher(/^"([^"]+)" of the response body should be (true|false)$/)(
		async ([exp, trueOrFalse]) => {
			const e = jsonata(exp)
			const v = e.evaluate(client.response.body)
			expect(v).to.equal(trueOrFalse === 'true')
			return v
		},
	),
	regexMatcher(
		/^"([^"]+)" of the response body should (equal|match) this JSON$/,
	)(async ([exp, equalOrMatch], step) => {
		if (step.interpolatedArgument === undefined) {
			throw new Error('Must provide argument!')
		}
		const j = JSON.parse(step.interpolatedArgument)
		const e = jsonata(exp)
		const v = e.evaluate(client.response.body)
		if (equalOrMatch === 'match') {
			expect(v).to.containSubset(j)
		} else {
			expect(v).to.deep.equal(j)
		}
		return v
	}),
	regexMatcher(/^I (POST|PUT|PATCH) (?:to )?([^ ]+) with this (JSON|payload)$/)(
		async ([method, path, jsonOrPayload], step) => {
			if (step.interpolatedArgument === undefined) {
				throw new Error('Must provide argument!')
			}
			const payload =
				jsonOrPayload === 'JSON'
					? JSON.parse(step.interpolatedArgument)
					: step.interpolatedArgument
			return [
				await client.request(method, path, undefined, undefined, payload),
				payload,
			]
		},
	),
	regexMatcher(
		/^I store "([^"]+)" of the response body as "([^"]+)"(?: encoded with (encodeURIComponent))?$/,
	)(async ([expression, storeName, encoder], _, runner) => {
		const e = jsonata(expression)
		const result = e.evaluate(client.response.body)
		expect(result).to.not.be.an('undefined')
		switch (encoder) {
			case 'encodeURIComponent':
				runner.store[storeName] = encodeURIComponent(result)
				break
			default:
				runner.store[storeName] = result
		}
		return result
	}),
	regexMatcher(/^I store the ([^ ]+) response header as "([^"]+)"$/)(
		async ([header, storeName], _, runner) => {
			expect(client.response.headers).to.have.property(header.toLowerCase())
			expect(client.response.headers[header.toLowerCase()]).to.have.not.be.an(
				'undefined',
			)
			runner.store[storeName] = client.response.headers[header.toLowerCase()]
			return client.response.headers[header.toLowerCase()]
		},
	),
]
