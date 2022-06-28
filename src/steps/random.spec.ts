import * as path from 'path'
import { FeatureRunner } from '../lib/runner'
import { randomStepRunners } from './random'
import { storageStepRunners } from './storage'

describe('randomSteps', () => {
	it('should generate a random UUID v4 by default', async () => {
		const runner = new FeatureRunner<any>(
			{},
			{
				dir: path.join(process.cwd(), 'test', 'random'),
				retry: false,
			},
		)
		const { success, store } = await runner
			.addStepRunners(storageStepRunners())
			.addStepRunners(randomStepRunners())
			.run()

		expect(success).toEqual(true)
		expect(store.uuidStorageKey).toMatch(
			/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
		)
	})
	it('should generate a custom random string', async () => {
		const runner = new FeatureRunner<any>(
			{},
			{
				dir: path.join(process.cwd(), 'test', 'random-custom'),
				retry: false,
			},
		)
		const { success } = await runner
			.addStepRunners(storageStepRunners())
			.addStepRunners(
				randomStepRunners({
					generators: {
						foo: () => 'foo',
					},
				}),
			)
			.run()

		expect(success).toEqual(true)
	})
})
