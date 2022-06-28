import {
	FeatureRunner,
	FlightRecorder,
	InterpolatedStep,
	StepRunnerFunc,
	Store,
} from './runner'

export type RegExpGroupStepRunner<W extends Store> = (
	args: { [key: string]: string },
	step: InterpolatedStep,
	runner: FeatureRunner<W>,
	feature: FlightRecorder,
) => Promise<any>

export const regexGroupMatcher =
	<W extends Store>(rx: RegExp) =>
	(stepRunner: RegExpGroupStepRunner<W>) =>
	(step: InterpolatedStep): false | StepRunnerFunc<W> => {
		const m = rx.exec(step.interpolatedText)
		if (!m || m.groups === undefined) {
			return false
		}
		return (runner: FeatureRunner<W>, feature: FlightRecorder): Promise<any> =>
			stepRunner(m.groups as { [key: string]: string }, step, runner, feature)
	}
