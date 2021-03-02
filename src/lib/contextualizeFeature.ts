import { ContextualizedFeature, SkippableFeature } from './load-features'
import { parseContexts } from './parseContexts'

/**
 * If a "Contexts" table is present, run the feature for every context
 */
export const contextualizeFeature = (
	feature: SkippableFeature,
): ContextualizedFeature[] => {
	const { description } = feature
	const contexts = parseContexts(description ?? '')
	if (contexts.length === 0)
		return [
			{
				...feature,
				context: {},
			},
		]
	return contexts.map((context) => ({
		...feature,
		context,
	}))
}
