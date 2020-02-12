import * as jsonata from 'jsonata';
import { StepRunner, StepRunnerFunc, Store } from '../lib/runner';
import { RestClient } from '../lib/rest-client';
import { expect } from 'chai';
import { regexMatcher } from '../lib/regexMatcher';
import { v4 } from 'uuid';
import { readFileSync } from 'fs';

const client = new RestClient();

export const restStepRunners = <W extends Store>(): StepRunner<W>[] => {
  const s = (rx: RegExp, run: StepRunnerFunc<W>): StepRunner<W> => ({
    willRun: regexMatcher(rx),
    run,
  });
  // When using a transform in a query the results can contain
  // null values (items that didn't match the transform), which
  // can cause random failures when testing for equality. This
  // function removes the nulls from body.items.
  const filterOutNulls = (body: any) => {
    if (body.items && body.items.length > 0) {
      const originalItemsCount = body.items.length;
      body.items = body.items.filter((item: any) => item !== null);
      console.log(
        `filterOutNulls removed ${originalItemsCount -
          body.items.length} null items`,
      );
    }
    return body;
  };
  return [
    s(/^the ([^ ]+) header is "([^"]+)"$/, async ([name, value]) => {
      client.headers[name] = value;
    }),
    s(/^the ([^ ]+) header is "([^"]+)"$/, async ([name, value]) => {
      client.headers[name] = value;
    }),
    s(/^the endpoint is "([^"]+)"$/, async ([endpoint]) => {
      client.endpoint = endpoint;
    }),
    s(
      /^I (GET|PUT|POST|PATCH|DELETE) (?:to )?([^ ]+)$/,
      async ([method, path]) => {
        return client.request(method, path);
      },
    ),
    s(
      /^I (GET|DELETE) ([^ ]+) with this query$/,
      async ([method, path], step) => {
        if (!step.interpolatedArgument) {
          throw new Error('Must provide argument!');
        }
        const j = JSON.parse(step.interpolatedArgument);
        return client.request(method, path, j);
      },
    ),
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
      if (!step.interpolatedArgument) {
        throw new Error('Must provide argument!');
      }
      const j = JSON.parse(step.interpolatedArgument);
      const body = filterOutNulls(client.response.body);
      console.log(body);
      expect(body).to.deep.equal(j);
      return body;
    }),
    s(/^"([^"]+)" of the response body is not empty$/, async ([exp]) => {
      const e = jsonata(exp);
      const body = filterOutNulls(client.response.body);
      console.log(body);
      const v = e.evaluate(body);
      expect(v).to.not.be.an('undefined');
      return v;
    }),
    s(
      /^"([^"]+)" of the response body should equal "([^"]+)"$/,
      async ([exp, expected]) => {
        const e = jsonata(exp);
        const body = filterOutNulls(client.response.body);
        console.log(body);
        const v = e.evaluate(body);
        expect(v).to.equal(expected);
        return v;
      },
    ),
    s(
      /^"([^"]+)" of the response body should equal ([0-9]+)$/,
      async ([exp, expected]) => {
        const e = jsonata(exp);
        const body = filterOutNulls(client.response.body);
        console.log(body);
        const v = e.evaluate(body);
        expect(v).to.equal(+expected);
        return v;
      },
    ),
    s(
      /^"([^"]+)" of the response body should be greater than ([0-9]+)$/,
      async ([exp, expected]) => {
        const e = jsonata(exp);
        const body = filterOutNulls(client.response.body);
        console.log(body);
        const v = e.evaluate(body);
        expect(v).to.be.gt(+expected);
        return v;
      },
    ),
    s(
      /^"([^"]+)" of the response body should equal this JSON$/,
      async ([exp], step) => {
        if (!step.interpolatedArgument) {
          throw new Error('Must provide argument!');
        }
        const j = JSON.parse(step.interpolatedArgument);
        const e = jsonata(exp);
        const body = filterOutNulls(client.response.body);
        console.log(body);
        const v = e.evaluate(body);
        expect(v).to.deep.equal(j);
        return v;
      },
    ),
    s(
      /^I (POST|PUT|PATCH) (?:to )?([^ ]+) with this JSON$/,
      async ([method, path], step) => {
        if (!step.interpolatedArgument) {
          throw new Error('Must provide argument!');
        }
        const re = new RegExp('<guid>', 'i');
        if (path.match(re)) {
          path = path.replace('<guid>', v4());
        }
        const j = JSON.parse(step.interpolatedArgument);
        return [await client.request(method, path, undefined, undefined, j), j];
      },
    ),
    s(
      /^I (POST|PUT|PATCH) (?:to )?([^ ]+) with the file "([^"]+)"$/,
      async ([method, path, imageFile]) => {
        const re = new RegExp('<guid>', 'i');
        if (path.match(re)) {
          path = path.replace('<guid>', v4());
        }
        const imageBuffer = readFileSync(imageFile);
        return [
          await client.request(method, path, undefined, undefined, imageBuffer),
          imageBuffer,
        ];
      },
    ),
    s(
      /^a page with ([0-9]+)(?: of ([0-9]+))? items? is returned$/,
      async ([num, total]) => {
        expect(client.response.body).to.have.property('items');
        expect(client.response.body).to.have.property('total');
        if (total) {
          expect(client.response.body.total).to.equal(+total);
        } else {
          expect(client.response.body.total).to.be.at.least(+num);
        }
        expect(client.response.body.items).to.have.length(+num);
        return client.response.body;
      },
    ),
    s(/^a page is returned$/, async () => {
      expect(client.response.body).to.have.property('items');
      expect(client.response.body).to.have.property('total');
      return client.response.body;
    }),
    s(
      /^I store "([^"]+)" of the response body as "([^"]+)"(?: encoded with (encodeURIComponent))?$/,
      async ([expression, storeName, encoder], _, runner) => {
        const e = jsonata(expression);
        const result = e.evaluate(client.response.body);
        expect(result).to.not.be.an('undefined');
        switch (encoder) {
          case 'encodeURIComponent':
            runner.store[storeName] = encodeURIComponent(result);
            break;
          default:
            runner.store[storeName] = result;
        }
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
};
