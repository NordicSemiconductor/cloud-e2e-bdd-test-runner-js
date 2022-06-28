import { defaultRetryConfig, retryConfiguration } from './retryConfiguration'

describe('retryConfiguration', () => {
	it('should parse the @Retry tag', () => {
		expect(
			retryConfiguration({
				tags: [
					{
						name: '@Retry=failAfter:10',
					},
				],
			}),
		).toEqual({
			...defaultRetryConfig,
			failAfter: 10,
		})
		expect(
			retryConfiguration({
				tags: [
					{
						name: '@Retry=failAfter:7,maxDelay:30000',
					},
				],
			}),
		).toEqual({
			...defaultRetryConfig,
			failAfter: 7,
			maxDelay: 30000,
		})
	})
})
