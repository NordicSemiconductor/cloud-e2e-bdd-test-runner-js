Feature: Feature Contexts

    If a feature has a contexts table,
    it should be repeated for all the entries.
    This allows to use contexts over multiple scenarios which is useful when
    scenarios need to be split up so that a retries do not trigger execution
    of a previous scenario.

    Note: "Context" has been chosen to distinguish it from the Gherkin "Scenario Outline + Examples"
    which is very similar, but is applied per scenario.

    Contexts:

    | arg1   | arg2  |
    | Hello  | World |
    | ¡Hola! | Mundo |

    Scenario:

        Given I log "<arg1> <arg2>"
