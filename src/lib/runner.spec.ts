import * as path from 'path'
import { regexGroupMatcher } from './regexGroupMatcher'
import { FeatureRunner } from './runner'

describe('runner', () => {
	describe('@Retry', () => {
		it('should be configurable', async () => {
			const result = await new FeatureRunner(
				{},
				{
					dir: path.join(process.cwd(), 'test', 'backoff'),
				},
			).run()

			expect(result.success).toEqual(false)
			expect(result.featureResults[0].scenarioResults[0].success).toEqual(false)
			expect(result.featureResults[0].scenarioResults[0].tries).toEqual(3)
			expect(
				result.featureResults[0].scenarioResults[0].retryConfiguration,
			).toEqual({
				initialDelay: 50,
				maxDelay: 100,
				failAfter: 3,
			})
		})
	})
	describe('Feature contexts', () => {
		it('should run a scenario for every context if given', async () => {
			const logs: string[] = []
			const result = await new FeatureRunner(
				{},
				{
					dir: path.join(process.cwd(), 'test', 'feature-contexts'),
					retry: false,
				},
			)
				.addStepRunners([
					regexGroupMatcher(/I log "(?<valueName>[^"]+)"/)(
						async ({ valueName }) => {
							logs.push(valueName)
							return valueName
						},
					),
				])
				.run()

			expect(result.success).toEqual(true)
			expect(result.featureResults).toHaveLength(2)
			expect(logs).toEqual(['Hello World', '¡Hola! Mundo'])
		})
	})
})
