import * as jsonata from 'jsonata';
import { StepRunner, StepRunnerFunc } from '../lib/runner';
import { RestClient } from '../lib/rest-client';
import { expect } from 'chai';
import { regexMatcher } from '../lib/regexMatcher';
import { ElivagarWorld } from '../run-features';

const client = new RestClient();

const s = (
  rx: RegExp,
  run: StepRunnerFunc<ElivagarWorld>,
): StepRunner<ElivagarWorld> => ({
  willRun: regexMatcher(rx),
  run,
});

export const runners: StepRunner<ElivagarWorld>[] = [
  s(/^the ([^ ]+) header is "([^"]+)"$/, async ([name, value]) => {
    client.headers[name] = value;
  }),
  s(/^the ([^ ]+) header is "([^"]+)"$/, async ([name, value]) => {
    client.headers[name] = value;
  }),
  s(/^the endpoint is "([^"]+)"$/, async ([endpoint]) => {
    client.endpoint = endpoint;
  }),
  s(/^I (GET|POST|PATCH|DELETE) (?:to )?([^ ]+)$/, async ([method, path]) => {
    return client.request(method, path);
  }),
  s(/^I GET ([^ ]+) with this query$/, async ([path], step) => {
    if (!step.interpolatedArgument) throw new Error('Must provide argument!');
    const j = JSON.parse(step.interpolatedArgument);
    return client.request('GET', path, j);
  }),
  s(/^the response status code should be ([0-9]+)$/, async ([statusCode]) => {
    expect(client.response.statusCode).to.equal(+statusCode);
    return client.response.statusCode;
  }),
  s(/^the response ([^ ]+) should be "([^"]+)"$/, async ([name, value]) => {
    expect(client.response.headers).to.have.property(name.toLowerCase());
    expect(client.response.headers[name.toLowerCase()]).to.equal(value);
    return client.response.headers[name.toLowerCase()];
  }),
  s(/^the response should equal this JSON$/, async (_, step) => {
    if (!step.interpolatedArgument) throw new Error('Must provide argument!');
    const j = JSON.parse(step.interpolatedArgument);
    expect(client.response.body).to.deep.equal(j);
    return client.response.body;
  }),
  s(/^"([^"]+)" of the response body is not empty$/, async ([exp]) => {
    const e = jsonata(exp);
    const v = e.evaluate(client.response.body);
    expect(v).to.not.be.an('undefined');
    return v;
  }),
  s(
    /^"([^"]+)" of the response body should equal "([^"]+)"$/,
    async ([exp, expected]) => {
      const e = jsonata(exp);
      const v = e.evaluate(client.response.body);
      expect(v).to.equal(expected);
      return v;
    },
  ),
  s(
    /^"([^"]+)" of the response body should equal this JSON$/,
    async ([exp], step) => {
      if (!step.interpolatedArgument) throw new Error('Must provide argument!');
      const j = JSON.parse(step.interpolatedArgument);
      const e = jsonata(exp);
      const v = e.evaluate(client.response.body);
      expect(v).to.deep.equal(j);
      return v;
    },
  ),
  s(
    /^I (POST|PATCH) (?:to )?([^ ]+) with "([^"]+)"$/,
    async ([method, path, value]) => {
      if (!value) throw new Error('Must provide a body value!');
      return [await client.request(method, path, undefined, undefined, value), value];
    },
  ),
  s(
    /^I (POST|PATCH) (?:to )?([^ ]+) with this JSON$/,
    async ([method, path], step) => {
      if (!step.interpolatedArgument) throw new Error('Must provide argument!');
      const j = JSON.parse(step.interpolatedArgument);
      return [await client.request(method, path, undefined, undefined, j), j];
    },
  ),
  s(
    /^a page with ([0-9]+) of ([0-9]+) items? is returned$/,
    async ([num, total]) => {
      expect(client.response.body).to.have.property('items');
      expect(client.response.body).to.have.property('total');
      expect(client.response.body.total).to.equal(+total);
      expect(client.response.body.items).to.have.length(+num);
      return client.response.body;
    },
  ),
  s(
    /^I store "([^"]+)" of the response body as "([^"]+)"$/,
    async ([expression, storeName], _, runner) => {
      const e = jsonata(expression);
      const result = e.evaluate(client.response.body);
      expect(result).to.not.be.an('undefined');
      runner.store[storeName] = result;
      return result;
    },
  ),
  s(
    /^I store the ([^ ]+) response header as "([^"]+)"$/,
    async ([header, storeName], _, runner) => {
      expect(client.response.headers).to.have.property(header.toLowerCase());
      expect(client.response.headers[header.toLowerCase()]).to.have.not.be.an(
        'undefined',
      );
      runner.store[storeName] = client.response.headers[header.toLowerCase()];
      return client.response.headers[header.toLowerCase()];
    },
  ),
];
