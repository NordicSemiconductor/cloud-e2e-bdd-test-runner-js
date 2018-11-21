import * as jsonata from 'jsonata';
import { StepRunner } from '../lib/runner';
import { regexMatcher } from '../lib/regexMatcher';
import { device } from 'aws-iot-device-sdk';
import { expect } from 'chai';
import { ElivagarWorld } from '../run-features';
import { ThingCredentials, ThingHelper } from '../lib/thing-helper';
import { EventBus, DevicePairedEvent } from '@nrfcloud/service-common';

const c = new ThingHelper();

class TestThing {
  credentials: ThingCredentials;
  client: device;
  lastMqttMessage: object = {};
  subscription?: Promise<object>;
  cancelSubscription?: () => void;

  constructor(credentials: ThingCredentials) {
    this.credentials = credentials;
    const { privateKey, certificate, clientId, brokerHostname } = credentials;

    this.client = new device({
      host: brokerHostname,
      privateKey: Buffer.from(privateKey, 'utf8'),
      clientCert: Buffer.from(certificate, 'utf8'),
      caPath: './features/data/ca.cert',
      clientId,
    });
  }

  async connect() {
    return new Promise(resolve => {
      this.client.on('connect', () => {
        resolve();
      });
    });
  }

  async disconnect() {
    return new Promise(resolve => this.client.end(false, resolve));
  }
}

let thing: TestThing;

const connections: { [key: string]: device } = {};

export const runners: StepRunner<ElivagarWorld>[] = [
  {
    willRun: regexMatcher(/^I have a Test Device/),
    run: async (_, __, runner) => {
      if (!thing) {
        thing = new TestThing(await c.createTestThingWithCredentials(runner));
        runner.store.clientId = thing.credentials.clientId;
        await thing.connect();
        runner.cleanup(() => thing.disconnect());
      }
      return thing.credentials.clientId;
    },
  },
  {
    willRun: regexMatcher(
      /^my Test Device publishes this message on the topic ([^ ]+)$/,
    ),
    run: async ([topic], step, runner) => {
      if (!step.interpolatedArgument) throw new Error('Must provide argument!');
      thing.client.publish(topic, step.interpolatedArgument);
      runner.progress(`MQTT > ${topic}`, step.interpolatedArgument);
      return JSON.parse(step.interpolatedArgument);
    },
  },
  {
    willRun: regexMatcher(/^I am subscribed to the topic ([^ ]+)$/),
    run: async ([topic], _, runner) => {
      if (thing.cancelSubscription) {
        thing.cancelSubscription();
      }
      thing.client.subscribe(topic);
      thing.subscription = new Promise((resolve, reject) => {
        const handle = setTimeout(() => reject(new Error('Timeout!')), 10000);
        thing.client.subscribe(topic);
        thing.client.on('message', (t: string, payload: any) => {
          runner.progress(`MQTT < ${t}`, payload.toString());
          thing.client.unsubscribe(topic);
          if (t !== topic) {
            reject(new Error(`Unexpected topic: ${t}!`));
          }
          resolve(JSON.parse(payload.toString()));
        });
        thing.cancelSubscription = () => {
          clearTimeout(handle);
          thing.client.unsubscribe(topic);
        };
      });
    },
  },
  {
    willRun: regexMatcher(/^I should receive a message$/),
    run: async () => {
      if (!thing.subscription) throw new Error('Not subscribed!');
      thing.lastMqttMessage = await thing.subscription;
    },
  },
  {
    willRun: regexMatcher(
      /^"([^"]+)" of the last message should equal this JSON$/,
    ),
    run: async ([exp], step) => {
      if (!step.interpolatedArgument) throw new Error('Must provide argument!');
      const j = JSON.parse(step.interpolatedArgument);
      const e = jsonata(exp);
      const result = e.evaluate(thing.lastMqttMessage);
      expect(result).to.deep.equal(j);
      return result;
    },
  },
  {
    willRun: regexMatcher(
      /^"([^"]+)" of the last message should equal "([^"]+)"$/,
    ),
    run: async ([exp, expected]) => {
      const e = jsonata(exp);
      const result = e.evaluate(thing.lastMqttMessage);
      expect(result).to.deep.equal(expected);
    },
  },
  {
    willRun: regexMatcher(/^I have paired a nRF91 DK as ([^ ]+)$/),
    run: async ([id], __, runner) => {
      // This registers a fake DK thing like it would happen in Iris,
      // The API listens to a DevicePairedEvent to be published on the Iris Event Bus, which we also publish
      const dk = await c.createTestThing(
        runner,
        ({ Stage, tenantId }, thingName) => ({
          desired: {
            stage: Stage,
            pairing: {
              state: 'paired',
              topics: {
                d2c: `${Stage}/${tenantId}/m/d/${thingName}/d2c`,
                c2d: `${Stage}/${tenantId}/m/d/${thingName}/c2d`,
              },
            },
          },
          reported: {
            connected: true,
            stage: Stage,
            pairing: {
              state: 'paired',
              topics: {
                d2c: `${Stage}/${tenantId}/m/d/${thingName}/d2c`,
                c2d: `${Stage}/${tenantId}/m/d/${thingName}/c2d`,
              },
            },
            elivagar: '1',
          },
        }),
      );
      runner.store[id] = dk;
      const b = new EventBus(runner.world.IrisBackendEventBusTestTopic);
      await b.publish(new DevicePairedEvent(runner.world.tenantId, dk));
      return dk;
    },
  },
  {
    willRun: regexMatcher(
      /^I am connected to "([^"]+)" using the certificate "([^"]+)" and the private key "([^"]+)" as "([^"]+)"$/m,
    ),
    run: ([broker, certificate, privateKey, clientId]) =>
      new Promise(resolve => {
        if (connections[clientId]) {
          return resolve(`Already connected using clientId "${clientId}" ...`);
        }

        console.log(
          JSON.stringify(
            {
              host: broker,
              privateKey: Buffer.from(privateKey, 'utf8'),
              clientCert: Buffer.from(certificate, 'utf8'),
              caPath: './features/data/ca.cert',
              clientId,
            },
            null,
            2,
          ),
        );

        connections[clientId] = new device({
          host: broker,
          privateKey: Buffer.from(privateKey, 'utf8'),
          clientCert: Buffer.from(certificate, 'utf8'),
          caPath: './features/data/ca.cert',
          clientId,
        });

        connections[clientId].on('connect', () => {
          resolve();
        });

        connections[clientId].on('error', err => {
          throw err;
        });
      }),
  },
  {
    willRun: regexMatcher(/^I disconnect as "([^"]+)"$/),
    run: async ([clientId]) => {
      if (!connections[clientId]) {
        throw new Error(`Not connected using clientId "${clientId}"!`);
      }
      connections[clientId].end();
      delete connections[clientId];
    },
  },
  {
    willRun: regexMatcher(
      /^I publish this message on the topic ([^ ]+) as "([^"]+)"$/,
    ),
    run: async ([topic, clientId], step, runner) => {
      if (!step.interpolatedArgument) throw new Error('Must provide argument!');
      if (!connections[clientId]) {
        throw new Error(`Not connected using clientId "${clientId}"!`);
      }
      console.log(topic, step.interpolatedArgument);
      connections[clientId].publish(topic, step.interpolatedArgument);
      runner.progress(`MQTT > ${topic}`, step.interpolatedArgument);
      return JSON.parse(step.interpolatedArgument);
    },
  },
];
