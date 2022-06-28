import { StoreKeyUndefinedError } from './runner'

/**
 * Replace {foo} storage placeholders
 */
export const replaceStoragePlaceholders =
	(data: { [key: string]: any }) =>
	(text: string): string => {
		const interpolated = Object.keys(data).reduce(
			(str, key) => str.replace(new RegExp(`{${key}}`, 'g'), data[key]),
			text,
		)
		const missed = interpolated.match(/\{[\w:]+\}/g)
		if (missed !== null && missed.length > 0) {
			throw new StoreKeyUndefinedError(
				missed.map((k) => k.slice(1, -1)),
				data,
			)
		}
		return interpolated
	}
