import { FeatureRunner } from './lib/runner';
import { runners as restStepRunners } from './steps/rest';
import { runners as mqttStepRunners } from './steps/mqtt';
import { runners as webhookStepRunners } from './steps/webhooks';
import { runners as irisStepRunners } from './steps/iris';
import { fetchStackConfiguration } from './lifecycle/fetch-stack-configuration';
import { v4 } from 'uuid';
import { DynamoDB } from 'aws-sdk';
import { DynamoDBApiKeyRepository } from '@nrfcloud/api-core';
import { ConsoleReporter } from './lib/console-reporter';

const db = new DynamoDB();
const crypto = require('crypto');
const program = require('commander');
const chalk = require('chalk');

let ran = false;

export type ElivagarWorld = {
  Stage: string;
  apiKey: string;
  restEndpoint: string;
  webhookReceiver: string;
  webhookQueue: string;
  tenantUUID: string;
  iotEndpoint: string;
  TestThingGroup: string;
  DeviceThingGroup: string;
  AccountThingGroup: string;
  GatewayThingType: string;
};

program
  .arguments('<featureDir>')
  .option('-r, --print-results', 'Print results')
  .option('-p, --progress', 'Print progress')
  .option('-s, --stack <stack>', 'Stack name', 'test-elivagar')
  .action(
    async (
      featureDir: string,
      {
        printResults,
        stack: stackName,
        progress,
      }: { printResults: boolean; stack: string; progress: boolean },
    ) => {
      ran = true;

      const config = await fetchStackConfiguration(stackName);

      // Register API Key
      const tenantUUID = v4();
      const apiKey = crypto.randomBytes(20).toString('hex');
      const apiKeyRepo = new DynamoDBApiKeyRepository(db, config.apiKeysTable);
      await apiKeyRepo.storeTenantUUID(apiKey, tenantUUID);

      const runner = new FeatureRunner<ElivagarWorld>(
        {
          apiKey: apiKey,
          Stage: config.Stage,
          restEndpoint: config.RestApiURL,
          webhookReceiver: config.WebhookTestApiURL,
          webhookQueue: config.WebhookTestSQSQueueURL,
          tenantUUID: tenantUUID,
          iotEndpoint: config.iotEndpoint,
          TestThingGroup: config.TestThingGroup,
          AccountThingGroup: config.AccountThingGroup,
          DeviceThingGroup: config.DeviceThingGroup,
          GatewayThingType: config.GatewayThingType,
        },
        {
          dir: featureDir,
          reporters: [
            new ConsoleReporter({ printResults, printProgress: progress }),
          ],
        },
      );

      runner
        .addStepRunners(restStepRunners)
        .addStepRunners(mqttStepRunners)
        .addStepRunners(webhookStepRunners)
        .addStepRunners(irisStepRunners)
        .run()
        .then(async ({ success }) => {
          if (!success) process.exit(1);
        });
    },
  )
  .parse(process.argv);

if (!ran) {
  program.outputHelp(chalk.red);
  process.exit(1);
}
