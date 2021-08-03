import * as jsonata from 'jsonata'
import * as chai from 'chai'
import { expect } from 'chai'
import { regexGroupMatcher } from '../lib/regexGroupMatcher'
import * as chaiSubset from 'chai-subset'
import { InterpolatedStep, StepRunnerFunc, Store } from '../lib/runner'

chai.use(chaiSubset)

export const storageStepRunners = (
	{
		encoders,
		decoders,
	}: {
		encoders: Record<string, (v: any) => string>
		decoders: Record<string, (v: any) => string>
	} = {
		encoders: {
			base64: (s: string): string => Buffer.from(s).toString('base64'),
			JSON: (s: any): string => JSON.stringify(JSON.stringify(JSON.parse(s))),
			replaceNewLines: (s: string): string => s.replace(/\n/g, '\\n'),
			querystring: (s: Record<string, any>): string =>
				Object.entries(s)
					.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
					.join('&'),
		},
		decoders: {
			base64: (s: string): string => Buffer.from(s, 'base64').toString('ascii'),
		},
	},
): ((step: InterpolatedStep) => false | StepRunnerFunc<Store>)[] => [
	regexGroupMatcher(
		/^"(?<exp>[^"]+)" should (?<equalOrMatch>(?:equal|be)|match) (?:(?<jsonMatch>this JSON)|"(?<stringMatch>[^"]+)"|(?<numMatch>[0-9]+)|(?<boolMatch>true|false))$/,
	)(
		async (
			{ exp, equalOrMatch, jsonMatch, stringMatch, numMatch, boolMatch },
			step,
			runner,
		) => {
			let expected

			if (jsonMatch) {
				if (step.interpolatedArgument === undefined) {
					throw new Error('Must provide argument!')
				}
				expected = JSON.parse(step.interpolatedArgument)
			} else if (stringMatch) {
				expected = stringMatch
			} else if (numMatch) {
				expected = parseInt(numMatch, 10)
			} else if (boolMatch) {
				expected = boolMatch === 'true'
			}

			const fragment = jsonata(exp).evaluate(runner.store)
			if (equalOrMatch === 'match') {
				expect(fragment).to.containSubset(expected)
			} else {
				expect(fragment).to.deep.equal(expected)
			}
			return [fragment]
		},
	),
	regexGroupMatcher(/^I parse "(?<exp>[^"]+)" into "(?<storeName>[^"]+)"$/)(
		async ({ exp, storeName }, _, runner) => {
			const e = jsonata(exp)
			const result = e.evaluate(runner.store)
			expect(result).to.not.be.an('undefined')
			runner.store[storeName] = JSON.parse(result)
			return runner.store[storeName]
		},
	),
	regexGroupMatcher(/^I store "(?<exp>[^"]+)" into "(?<storeName>[^"]+)"$/)(
		async ({ exp, storeName }, _, runner) => {
			const e = jsonata(exp)
			const result = e.evaluate(runner.store)
			expect(result).to.not.be.an('undefined')
			runner.store[storeName] = result
			return result
		},
	),
	regexGroupMatcher(
		/^I (?<encodeOrDecode>encode|decode) (?:"(?<exp>[^"]+)"|this payload) into "(?<storeName>[^"]+)" using (?<encoding>[a-zA-Z0-9]+)$/,
	)(async ({ encodeOrDecode, exp, storeName, encoding }, step, runner) => {
		let data
		if (exp === undefined) {
			if (step.interpolatedArgument === undefined)
				throw new Error('Must provide argument!')
			data = step.interpolatedArgument
		} else {
			const e = jsonata(exp)
			data = e.evaluate(runner.store)
		}
		expect(data).to.not.be.an('undefined')
		const encoder =
			encodeOrDecode === 'encode' ? encoders[encoding] : decoders[encoding]
		try {
			runner.store[storeName] = encoder(data)
		} catch (err) {
			console.error(data)
			throw new Error(`Encoding using ${encoding} failed: ${err.message}!`)
		}
		return [data, runner.store[storeName]]
	}),
	regexGroupMatcher(
		/^I store a random number between (?<minInclusive>[0-9]+) and (?<maxInclusive>[0-9]+) into "(?<storeName>[^"]+)"$/,
	)(async ({ minInclusive, maxInclusive, storeName }, _, runner) => {
		const min = parseInt(minInclusive, 10)
		const max = parseInt(maxInclusive, 10)
		if (max <= min)
			throw new Error(`max inclusive ${max} must be greater than ${min}!`)
		const n = Math.floor(max - min) + min
		runner.store[storeName] = n
		return [n]
	}),
]
