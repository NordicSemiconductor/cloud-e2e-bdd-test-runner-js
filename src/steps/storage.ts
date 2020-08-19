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
		encoders: Record<string, (v: string) => string>
		decoders: Record<string, (v: string) => string>
	} = {
		encoders: {
			base64: (s: string): string => Buffer.from(s).toString('base64'),
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
	regexGroupMatcher(/^I escape this JSON into "(?<storeName>[^"]+)"$/)(
		async ({ storeName }, step, runner) => {
			if (step.interpolatedArgument === undefined) {
				throw new Error('Must provide argument!')
			}
			const j = JSON.parse(step.interpolatedArgument)
			runner.store[storeName] = JSON.stringify(JSON.stringify(j))
			return runner.store[storeName]
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
		/^I (?<encodeOrDecode>encode|decode) this payload into "(?<storeName>[^"]+)" using (?<encoding>[a-z0-9]+)$/,
	)(async ({ encodeOrDecode, storeName, encoding }, step, runner) => {
		if (step.interpolatedArgument === undefined) {
			throw new Error('Must provide argument!')
		}
		const encoder =
			encodeOrDecode === 'encode' ? encoders[encoding] : decoders[encoding]
		runner.store[storeName] = encoder(step.interpolatedArgument)
		return [step.interpolatedArgument, runner.store[storeName]]
	}),
]
