import { randomUUID } from 'node:crypto'
import { regexGroupMatcher } from '../lib/regexGroupMatcher'
import { InterpolatedStep, StepRunnerFunc, Store } from '../lib/runner'

export type RandomStringGenerators = { [key: string]: () => string }

export const randomStepRunners = (
	{ generators }: { generators: RandomStringGenerators } = {
		generators: { UUID: (): string => randomUUID() },
	},
): ((step: InterpolatedStep) => false | StepRunnerFunc<Store>)[] => [
	regexGroupMatcher(
		/^I have a random (?<generatorId>[^ ]+) in "(?<storeName>[^"]+)"$/,
	)(async ({ generatorId, storeName }, _, runner) => {
		const generator = generators[generatorId]
		if (generator === undefined) {
			throw new Error(`Unknown random string generator "${generatorId}"!`)
		}
		runner.store[storeName] = generator()
		return runner.store[storeName]
	}),
]
