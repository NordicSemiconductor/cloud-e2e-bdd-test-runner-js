import {
	FeatureRunner,
	FlightRecorder,
	InterpolatedStep,
	StepRunnerFunc,
	Store,
} from './runner'

export type RegExpStepRunner<W extends Store> = (
	args: string[],
	step: InterpolatedStep,
	runner: FeatureRunner<W>,
	feature: FlightRecorder,
) => Promise<any>

export const regexMatcher =
	<W extends Store>(rx: RegExp) =>
	(stepRunner: RegExpStepRunner<W>) =>
	(step: InterpolatedStep): false | StepRunnerFunc<W> => {
		const m = rx.exec(step.interpolatedText)
		if (!m) {
			return false
		}
		return (runner: FeatureRunner<W>, feature: FlightRecorder): Promise<any> =>
			stepRunner(m.slice(1), step, runner, feature)
	}
