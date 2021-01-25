import * as AWS from 'aws-sdk'
import { regexMatcher } from '../lib/regexMatcher'
import * as cognito from './cognito'
import { InterpolatedStep, StepRunnerFunc, Store } from '../lib/runner'
import { regexGroupMatcher } from '../lib/regexGroupMatcher'

export const accessKeyAuthentication = 'accessKeyAuthentication'
export type AWSSDKFlightRecorderSettings = {
	accessKeyId: string
	secretAccessKey: string
}

/**
 * BDD steps for using the AWS SDK directly
 */
export const awsSdkStepRunners = ({
	constructorArgs,
}: {
	constructorArgs?: {
		[key: string]: {
			[key: string]: string
		}
	} & {
		__all?: {
			[key: string]: string
		}
	}
}): ((step: InterpolatedStep) => false | StepRunnerFunc<Store>)[] => [
	regexMatcher(/^I execute "([^"]+)" of the AWS ([^ ]+) SDK( with)?$/)(
		async ([method, api, withArgs], step, runner, flightRecorder) => {
			let argument: any
			if (withArgs) {
				if (step.interpolatedArgument === undefined) {
					throw new Error('Must provide argument!')
				}
				try {
					argument = JSON.parse(step.interpolatedArgument)
				} catch {
					throw new Error(
						`Failed to parse argument: ${step.interpolatedArgument}`,
					)
				}
			}
			let extraArgs = {} as any
			const cognitoEnabled = flightRecorder.flags[cognito.cognitoAuthentication]
			const accessKeyAuth = flightRecorder.flags[accessKeyAuthentication]
			if (cognitoEnabled) {
				const {
					secretAccessKey,
					identityId,
					accessKeyId,
					sessionToken,
				} = flightRecorder.settings[
					cognito.cognitoAuthentication
				] as cognito.CognitoFlightRecorderSettings
				extraArgs = {
					credentials: {
						secretAccessKey,
						identityId,
						accessKeyId,
						sessionToken,
					},
				}
				await runner.progress(
					`AWS-SDK.${api}.auth`,
					extraArgs.credentials.identityId,
				)
			} else if (accessKeyAuth) {
				const { secretAccessKey, accessKeyId } = flightRecorder.settings[
					accessKeyAuthentication
				] as AWSSDKFlightRecorderSettings
				extraArgs = {
					credentials: {
						secretAccessKey,
						accessKeyId,
					},
				}
				await runner.progress(
					`AWS-SDK.${api}.auth`,
					extraArgs.credentials.accessKeyId,
				)
			}
			const args = {
				...constructorArgs?.__all,
				...constructorArgs?.[api],
				...extraArgs,
			}
			// @ts-ignore
			const a = new AWS[api](args)
			await runner.progress(
				`AWS-SDK.${api}`,
				`${method}(${argument !== undefined ? JSON.stringify(argument) : ''})`,
			)
			const res = await new Promise((resolve, reject) => {
				a[method](argument, (err: Error, res: any) => {
					if (err !== undefined && err !== null) return reject(err)
					resolve(res)
				})
			})
			runner.store.awsSdk = {
				res,
			}
			return res
		},
	),
	regexGroupMatcher(
		/^I am authenticated with AWS key "(?<accessKeyId>[^"]+)" and secret "(?<secretAccessKey>[^"]+)"$/,
	)(async ({ accessKeyId, secretAccessKey }, _, __, { flags, settings }) => {
		flags[accessKeyAuthentication] = true
		settings[accessKeyAuthentication] = {
			accessKeyId,
			secretAccessKey,
		}
	}),
]
