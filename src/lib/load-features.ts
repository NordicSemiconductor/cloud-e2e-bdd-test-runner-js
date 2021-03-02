import { afterRx } from './runner'
import TokenScanner from 'gherkin/dist/src/TokenScanner'
import AstBuilder from 'gherkin/dist/src/AstBuilder'
import { IdGenerator } from 'cucumber-messages'
import Parser from 'gherkin/dist/src/Parser'
import TokenMatcher from 'gherkin/dist/src/TokenMatcher'
import { messages as cucumber } from 'cucumber-messages'
import * as toposort from 'toposort'
import * as globAsync from 'glob'
import { promisify } from 'util'
import * as path from 'path'

const glob = promisify(globAsync)
import { readFileSync } from 'fs'

const parser = new Parser(new AstBuilder(IdGenerator.uuid()))
const matcher = new TokenMatcher()

export type SkippableFeature = cucumber.GherkinDocument.IFeature & {
	skip: boolean
	dependsOn: cucumber.GherkinDocument.IFeature[]
}

export type ContextualizedFeature = SkippableFeature & {
	context: Record<string, string>
}

export const parseFeatures = (featureData: Buffer[]): SkippableFeature[] => {
	const parsedFeatures = featureData.map((d) => {
		// Parse the feature files
		const scanner = new TokenScanner(d.toString())
		return parser.parse(scanner, matcher)
			.feature as cucumber.GherkinDocument.IFeature
	})

	// Sort @Last to end
	const sortedByLast = parsedFeatures.sort(({ tags: t1 }) =>
		(t1 || []).find(({ name }) => name === '@Last') ? 1 : -1,
	)

	const featureNames = sortedByLast.map(({ name }) => name)

	// Sort the features by the step 'I am run after the "..." feature' using toposort
	const featureDependencies = sortedByLast.map((feature) => {
		const bgSteps = feature.children
			?.filter(({ background }) => background)
			.map((bg) =>
				(bg.background?.steps ?? []).filter(
					({ text }) => typeof text === 'string' && afterRx.test(text),
				),
			)
			.flat()

		const runAfter = bgSteps?.map((afterStep) => {
			if (afterStep === undefined) return
			const m =
				typeof afterStep.text === 'string' && afterRx.exec(afterStep.text)
			if (!Array.isArray(m)) {
				throw new Error(`Failed to find feature in ${afterStep.text}`)
			}
			if (!featureNames.includes(m[1])) {
				throw new Error(
					`The feature ${m[1]} you want to run after does not exist!`,
				)
			}
			return m[1]
		})

		if (Array.isArray(runAfter) && runAfter.length > 0) {
			return runAfter.map((dep) => [dep, feature.name])
		}

		return [[feature.name, undefined]]
	})

	const sortedFeatureNames = toposort(
		featureDependencies.flat() as [string, string | undefined][],
	).filter((feature?: any) => feature)

	const dependencies = (
		f: cucumber.GherkinDocument.IFeature,
	): cucumber.GherkinDocument.IFeature[] =>
		sortedFeatures.filter(({ name }) => {
			const depNames = featureDependencies
				.flat()
				.filter(([, fname]) => fname === f.name)
				.map(([depName]) => depName)
			return depNames.includes(name)
		})

	// Now bring the features in the right order
	const sortedFeatures: cucumber.GherkinDocument.IFeature[] = sortedFeatureNames.map(
		(featureName: string) =>
			parsedFeatures.find(
				({ name }) => name === featureName,
			) as cucumber.GherkinDocument.IFeature,
	)

	// Find features to be skipped
	const isOnly = (f: cucumber.GherkinDocument.IFeature) =>
		f?.tags?.find(({ name }) => name === '@Only')
	const only = parsedFeatures.filter(isOnly)
	const onlyNames = only.map(({ name }) => name)

	return sortedFeatures.map((f) => {
		const { tags, name: featureName } = f
		const skip =
			(tags ?? []).filter(({ name }) => name === '@Skip').length > 0 ||
			(onlyNames.length && !onlyNames.includes(featureName))

		return {
			...f,
			skip: skip === true,
			dependsOn: dependencies(f),
		}
	})
}

export const fromDirectory = async (
	dir: string,
): Promise<SkippableFeature[]> => {
	const scan = path.join(path.resolve(dir), '*.feature')
	const featureFiles = await glob(scan)
	const features = parseFeatures(featureFiles.map((f) => readFileSync(f)))
	if (!features.length) {
		throw new Error(`No features found in directory ${dir}`)
	}
	return features
}
