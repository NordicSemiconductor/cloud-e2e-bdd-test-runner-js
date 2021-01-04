import { Store, InterpolatedStep, StepRunnerFunc } from '../lib/runner'
import { regexMatcher } from '../lib/regexMatcher'
import {
	CognitoIdentityClient,
	GetCredentialsForIdentityCommand,
	GetOpenIdTokenForDeveloperIdentityCommand,
} from '@aws-sdk/client-cognito-identity'
import {
	AdminCreateUserCommand,
	AdminInitiateAuthCommand,
	AdminRespondToAuthChallengeCommand,
	CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider'

const randSeq = () =>
	Math.random()
		.toString(36)
		.replace(/[^a-z]+/g, '')

export type CognitoStepRunnerWorld = Store & {
	userPoolId: string
	identityPoolId: string
	userPoolClientId: string
	region: string
}

export const cognitoAuthentication = 'cognitoAuthentication'
export type CognitoFlightRecorderSettings = {
	userId: string
	accessKeyId: string
	identityId: string
	secretAccessKey: string
	sessionToken: string
}

/**
 * BDD steps for authenticating against AWS Cognito
 */
export const cognitoStepRunners = <W extends CognitoStepRunnerWorld>({
	region,
	developerProviderName,
	emailAsUsername,
}: {
	developerProviderName: string
	region: string
	emailAsUsername?: boolean
}): ((step: InterpolatedStep) => false | StepRunnerFunc<W>)[] => {
	const ci = new CognitoIdentityClient({
		region,
	})
	const cisp = new CognitoIdentityProviderClient({
		region,
	})
	return [
		regexMatcher<W>(/^I am authenticated with Cognito(?: as "([^"]+)")?$/)(
			async ([userId], __, runner, { flags, settings }) => {
				flags[cognitoAuthentication] = true
				const prefix = userId ? `cognito:${userId}` : `cognito`
				if (runner.store[`${prefix}:IdentityId`] === undefined) {
					const Username = userId ? `${userId}-${randSeq()}` : randSeq()
					const email = `${Username.toLowerCase()}@example.com`
					const cognitoUsername = emailAsUsername === true ? email : Username
					await runner.progress(
						'Cognito',
						`Registering user ${cognitoUsername}`,
					)
					const TemporaryPassword = `${randSeq()}${randSeq().toUpperCase()}${Math.random()}`
					await cisp.send(
						new AdminCreateUserCommand({
							UserPoolId: runner.world.userPoolId,
							Username: cognitoUsername,
							UserAttributes: [
								{
									Name: 'email',
									Value: email,
								},
								{
									Name: 'email_verified',
									Value: 'True',
								},
							],
							TemporaryPassword,
						}),
					)

					const newPassword = `${randSeq()}${randSeq().toUpperCase()}${Math.random()}`
					const { Session } = await cisp.send(
						new AdminInitiateAuthCommand({
							AuthFlow: 'ADMIN_NO_SRP_AUTH',
							UserPoolId: runner.world.userPoolId,
							ClientId: runner.world.userPoolClientId,
							AuthParameters: {
								USERNAME: cognitoUsername,
								PASSWORD: TemporaryPassword,
							},
						}),
					)
					const { AuthenticationResult } = await cisp.send(
						new AdminRespondToAuthChallengeCommand({
							ChallengeName: 'NEW_PASSWORD_REQUIRED',
							UserPoolId: runner.world.userPoolId,
							ClientId: runner.world.userPoolClientId,
							Session: Session!,
							ChallengeResponses: {
								USERNAME: cognitoUsername,
								NEW_PASSWORD: newPassword,
							},
						}),
					)

					runner.store[`${prefix}:IdToken`] = AuthenticationResult!.IdToken

					runner.store[`${prefix}:Username`] = cognitoUsername
					runner.store[userId ? `${userId}:Email` : 'Email'] = email

					const { IdentityId, Token } = await ci.send(
						new GetOpenIdTokenForDeveloperIdentityCommand({
							IdentityPoolId: runner.world.identityPoolId,
							Logins: {
								[developerProviderName]: runner.store[`${prefix}:Username`],
							},
							TokenDuration: 3600,
						}),
					)

					const { Credentials } = await ci.send(
						new GetCredentialsForIdentityCommand({
							IdentityId: IdentityId!,
							Logins: {
								['cognito-identity.amazonaws.com']: Token!,
							},
						}),
					)

					runner.store[`${prefix}:IdentityId`] = IdentityId
					runner.store[`${prefix}:Token`] = Token
					runner.store[`${prefix}:AccessKeyId`] = Credentials!.AccessKeyId
					runner.store[`${prefix}:SecretKey`] = Credentials!.SecretKey
					runner.store[`${prefix}:SessionToken`] = Credentials!.SessionToken
				}
				settings[cognitoAuthentication] = {
					userId: prefix,
					accessKeyId: runner.store[`${prefix}:AccessKeyId`],
					identityId: runner.store[`${prefix}:IdentityId`],
					secretAccessKey: runner.store[`${prefix}:SecretKey`],
					sessionToken: runner.store[`${prefix}:SessionToken`],
				}
				return [runner.store[`${prefix}:IdentityId`]]
			},
		),
	]
}
