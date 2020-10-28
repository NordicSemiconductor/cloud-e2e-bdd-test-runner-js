import { fromDirectory } from './load-features'
import * as path from 'path'

describe('load-features', () => {
	describe('should support dependencies', () => {
		test('if they are written in the Scenario Background', async () => {
			const features = await fromDirectory(
				path.join(process.cwd(), 'test', 'required-order'),
			)
			const fnames = features.map(({ name }) => name)
			expect(fnames.indexOf('First')).toBeLessThan(fnames.indexOf('Second'))

			const feature2 = features.find(({ name }) => name === 'Second')
			expect(feature2?.dependsOn[0].name).toEqual('First')
		})

		test('and adding multiple should be possible', async () => {
			const features = await fromDirectory(
				path.join(process.cwd(), 'test', 'multiple-dependencies'),
			)
			const fnames = features.map(({ name }) => name)
			expect(fnames.indexOf('Last')).toBeGreaterThan(fnames.indexOf('First'))
			expect(fnames.indexOf('Last')).toBeGreaterThan(fnames.indexOf('Second'))
			const lastFeature = features.find(({ name }) => name === 'Last')
			const deps = lastFeature?.dependsOn.map(({ name }) => name)
			expect(deps).toContain('First')
			expect(deps).toContain('Second')
		})

		it('should run a single feature with background but no dependency', async () => {
			const features = await fromDirectory(
				path.join(process.cwd(), 'test', 'single-feature-with-bg'),
			)
			expect(features).toHaveLength(1)
		})
	})

	describe('@Last', () => {
		test('should run a feature last', async () => {
			const features = await fromDirectory(
				path.join(process.cwd(), 'test', 'required-order'),
			)
			expect(features.map(({ name }) => name).pop()).toEqual('Last')
		})
	})

	describe('@Only', () => {
		test('should run only specific features', async () => {
			const features = await fromDirectory(
				path.join(process.cwd(), 'test', '@Only'),
			)
			expect(
				features.filter(({ skip }) => !skip).map(({ name }) => name),
			).toEqual(['Only'])
		})
	})

	describe('@Skip', () => {
		test('should run only specific features', async () => {
			const features = await fromDirectory(
				path.join(process.cwd(), 'test', '@Skip'),
			)
			expect(
				features.filter(({ skip }) => !skip).map(({ name }) => name),
			).toEqual(['Only'])
		})
	})

	it('should fail if no feature are found in the directory', () => {
		void expect(
			fromDirectory(path.join(process.cwd(), 'test', 'foo')),
		).rejects.toThrowError(/^No features found in directory .+foo$/)
	})
})
