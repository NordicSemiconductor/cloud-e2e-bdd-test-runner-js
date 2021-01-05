import * as jsonata from 'jsonata'
import * as chai from 'chai'
import { expect } from 'chai'
import { regexMatcher } from '../lib/regexMatcher'
import { WebhookReceiver } from '../lib/webhook-receiver'
import * as chaiSubset from 'chai-subset'
import { regexGroupMatcher } from '../lib/regexGroupMatcher'
import { StepRunnerFunc, Store, InterpolatedStep } from '../lib/runner'

chai.use(chaiSubset)

export const webhookStepRunners = ({
	webhookQueue,
}: {
	webhookQueue: string
}): ((step: InterpolatedStep) => false | StepRunnerFunc<Store>)[] => {
	let r: WebhookReceiver
	return [
		regexMatcher(
			/^the Webhook Receiver "([^"]+)" should be called$/,
		)(async ([MessageGroupId], _, runner) =>
			r.receiveWebhookRequest(MessageGroupId, runner).then((r) => r.body),
		),
		regexMatcher(
			/^"([^"]+)" of the webhook request body should equal "([^"]+)"$/,
		)(async ([exp, expected]) => {
			const e = jsonata(exp)
			expect(r.latestWebhookRequest).not.to.be.an('undefined')
			const b = r.latestWebhookRequest?.body
			expect(b).not.to.be.an('undefined')
			const result = e.evaluate(b)
			expect(result).to.deep.equal(expected)
			return b
		}),
		regexMatcher(/^the webhook request body should (equal|match) this JSON$/)(
			async ([equalOrMatch], step) => {
				if (step.interpolatedArgument === undefined) {
					throw new Error('Must provide argument!')
				}
				const j = JSON.parse(step.interpolatedArgument)
				const b = r.latestWebhookRequest?.body
				expect(b).not.to.be.an('undefined')
				if (equalOrMatch === 'match') {
					expect(b).to.containSubset(j)
				} else {
					expect(b).to.deep.equal(j)
				}
				return b
			},
		),
		regexMatcher(/^I have a Webhook Receiver/)(async () => {
			r = new WebhookReceiver({ queueUrl: webhookQueue })
			await r.clearQueue()
		}),
		regexGroupMatcher(
			/^I store "(?<exp>[^"]+)" of the last webhook request into "(?<storeName>[^"]+)"$/,
		)(async ({ exp, storeName }, _, runner) => {
			const e = jsonata(exp)
			const result = e.evaluate(r.latestWebhookRequest)
			expect(result).to.not.be.an('undefined')
			runner.store[storeName] = result
			return result
		}),
	]
}
