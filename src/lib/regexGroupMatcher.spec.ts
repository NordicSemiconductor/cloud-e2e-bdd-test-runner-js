import * as path from 'path'
import { regexGroupMatcher } from './regexGroupMatcher'
import { FeatureRunner } from './runner'

describe('regexGroupMatcher', () => {
	it('should match groups', async () => {
		const runner = new FeatureRunner<any>(
			{},
			{
				dir: path.join(process.cwd(), 'test', 'regex-group-matcher'),
			},
		)

		expect.assertions(2)

		const { success } = await runner
			.addStepRunners([
				regexGroupMatcher(
					/I use regexGroupMatcher to match "(?<valueName>[^"]+)"/,
				)(async ({ valueName }) => {
					expect(valueName).toEqual('some value')
				}),
			])
			.run()

		expect(success).toEqual(true)
	})
})
