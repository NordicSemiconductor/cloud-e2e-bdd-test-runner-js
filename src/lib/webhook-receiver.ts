import {
	DeleteMessageCommand,
	ReceiveMessageCommand,
	SQSClient,
} from '@aws-sdk/client-sqs'
import { FeatureRunner } from './runner'

type WebhookRequest = {
	headers: { [key: string]: string }
	body: { [key: string]: string }
}

/**
 * Manages the waiting for webhook requests.
 */
export class WebhookReceiver {
	private readonly queueUrl: string
	private readonly sqs: SQSClient
	latestWebhookRequest?: WebhookRequest

	constructor({ queueUrl }: { queueUrl: string }) {
		this.queueUrl = queueUrl
		this.sqs = new SQSClient({})
	}

	/**
	 * When multiple alerts are configured, messages may result in the webhook
	 * receiver receiving multiple requests from different alerts.
	 *
	 * This receiver will fetch a webhook request for a specific message group
	 * id (which is the path after the API URL: {webhookReceiver}/message-group).
	 *
	 * Requests from other message groups will be discarded.
	 */
	async receiveWebhookRequest(
		MessageGroupId: string,
		runner: FeatureRunner<any>,
	): Promise<WebhookRequest> {
		const { Messages } = await this.sqs.send(
			new ReceiveMessageCommand({
				QueueUrl: this.queueUrl,
				MaxNumberOfMessages: 1,
				MessageAttributeNames: ['All'],
				AttributeNames: ['MessageGroupId'],
				WaitTimeSeconds: 20,
			}),
		)

		if (Messages === undefined || !Messages.length) {
			throw new Error('No webhook request received!')
		}
		const { Body, MessageAttributes, ReceiptHandle, Attributes } = Messages[0]
		await this.sqs.send(
			new DeleteMessageCommand({
				QueueUrl: this.queueUrl,
				ReceiptHandle: ReceiptHandle as string,
			}),
		)

		if (Attributes === undefined || MessageAttributes === undefined)
			throw new Error(
				`No attributes defined in Message "${JSON.stringify(Messages[0])}"!`,
			)

		const attrs = MessageAttributes
		const { MessageGroupId: RcvdMessageGroupId } = Attributes
		this.latestWebhookRequest = {
			headers: Object.keys(attrs ?? {}).reduce(
				(hdrs: { [key: string]: string }, key) => {
					hdrs[key] = attrs[key].StringValue as string
					return hdrs
				},
				{},
			),
			body: JSON.parse(Body as string),
		}
		await runner.progress(
			`Webhook < ${RcvdMessageGroupId}`,
			JSON.stringify(this.latestWebhookRequest.body),
		)
		if (RcvdMessageGroupId !== MessageGroupId) {
			throw new Error(
				`Wrong webhook request received! Expected "${MessageGroupId}", got "${RcvdMessageGroupId}"`,
			)
		}
		return this.latestWebhookRequest
	}

	/**
	 * Deletes all messages in a Queue instead of using purge (which can only be used every 60 seconds)
	 */
	async clearQueue(): Promise<void> {
		const { Messages } = await this.sqs.send(
			new ReceiveMessageCommand({
				QueueUrl: this.queueUrl,
				MaxNumberOfMessages: 10,
				WaitTimeSeconds: 0,
			}),
		)

		if (Messages !== undefined) {
			await Promise.all(
				Messages.map(async ({ ReceiptHandle }) =>
					this.sqs.send(
						new DeleteMessageCommand({
							QueueUrl: this.queueUrl,
							ReceiptHandle: ReceiptHandle as string,
						}),
					),
				),
			)
			await this.clearQueue()
			this.latestWebhookRequest = undefined
		}
	}
}
