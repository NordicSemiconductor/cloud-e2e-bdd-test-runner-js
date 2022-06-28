const tableMatch = /^\|([^|]+\|)+$/

/**
 * Parse a Contexts definition into a table
 */
export const parseContexts = (
	description: string,
): Record<string, string>[] => {
	const lines = description.split('\n').map((s) => s.trim())
	if (lines.find((s) => s === 'Contexts:') === undefined) return []

	const table = []
	let contextsFound = false
	// only pick up table lines immediately following the Contexts: token
	for (let line = 0; line < lines.length; line++) {
		if (lines[line] === 'Contexts:' && lines[line + 1] === '') {
			contextsFound = true
			continue
		}
		if (!contextsFound) continue
		if (lines[line] === '') continue
		if (tableMatch.exec(lines[line]) === null) {
			break
		}
		table.push(
			lines[line]
				.slice(1, 1 + lines[line].length - 2)
				.split('|')
				.map((s) => s.trim()),
		)
	}
	const [headers, ...rest] = table
	return rest.map((line) =>
		headers.reduce(
			(row, header, k) => ({ ...row, [header]: line[k] }),
			{} as Record<string, string>,
		),
	)
}
