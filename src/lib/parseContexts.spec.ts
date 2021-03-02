import { parseContexts } from './parseContexts'

const descriptionWithContexts = `If a feature has a contexts table,
    it should be repeated for all the entries.
    This allows to use contexts over multiple scenarios which is useful when
    scenarios need to be split up so that a retries do not trigger execution
    of a previous scenario.

    Note: "Context" has been chosen to distinguish it from the Gherkin "Scenario Outline + Examples"
    which is very similar, but is applied per scenario.

    Contexts:

    | arg1   | arg2  |
    | Hello  | World |
    | ¡Hola! | Mundo |`

const descriptionWithoutContexts = `No contexts here.`

describe('parseContextss', () => {
	it('should parse contexts', () => {
		expect(parseContexts(descriptionWithContexts)).toEqual([
			{
				arg1: 'Hello',
				arg2: 'World',
			},
			{
				arg1: '¡Hola!',
				arg2: 'Mundo',
			},
		])
	})
	it('should ignore if contexts do not exist', () => {
		expect(parseContexts(descriptionWithoutContexts)).toEqual([])
	})
})
