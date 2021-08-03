import * as path from 'path'
import { FeatureRunner } from './runner'
import { ConsoleReporter, Config } from './console-reporter'
import { storageStepRunners } from '../steps/storage'

const createRunner = (config?: Partial<Config>) => {
	const mockConsole = {
		log: jest.fn<void, any>(),
		error: jest.fn<void, any>(),
	}
	const runner = new FeatureRunner<any>(
		{},
		{
			reporters: [
				new ConsoleReporter({
					...config,
					console: mockConsole,
				}),
			],
			dir: path.join(process.cwd(), 'test', 'storage'),
			retry: false,
			store: {
				foo: 'bar',
				bar: {
					baz: 'foo',
					num: 42,
					b: true,
				},
			},
		},
	)
	return {
		runner,
		mockConsole,
	}
}

const stripColors = (s: string) => s.replace(/\u001b\[[0-9;]+m/g, '') // eslint-disable-line no-control-regex

describe('Console Reporter', () => {
	it('should print a summary if printSummary=true', async () => {
		const { runner, mockConsole } = createRunner({ printSummary: true })

		const { success } = await runner.addStepRunners(storageStepRunners()).run()
		expect(success).toEqual(true)

		const logs = mockConsole.log.mock.calls
			.map((args) => args.join(' '))
			.join('\n')

		expect(stripColors(logs)).toMatch(
			/Feature Summary: {3}0 failed, 0 skipped, 5 passed, 5 total/,
		)
		expect(stripColors(logs)).toMatch(
			/Scenario Summary: {2}0 failed, 0 skipped, 16 passed, 16 total/,
		)
	})
	it('should not print a summary if printSummary=false', async () => {
		const { runner, mockConsole } = createRunner()

		const { success } = await runner.addStepRunners(storageStepRunners()).run()
		expect(success).toEqual(true)

		const logs = mockConsole.log.mock.calls
			.map((args) => args.join(' '))
			.join('\n')

		expect(logs).not.toContain('Feature Summary:')
	})
})
