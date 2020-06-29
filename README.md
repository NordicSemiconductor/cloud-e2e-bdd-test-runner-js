# End-to-end Behaviour Driven Design Test Runner [![npm version](https://img.shields.io/npm/v/@bifravst/e2e-bdd-test-runner.svg)](https://www.npmjs.com/package/@bifravst/e2e-bdd-test-runner)

[![GitHub Actions](https://github.com/bifravst/e2e-bdd-test-runner/workflows/Test%20and%20Release/badge.svg)](https://github.com/bifravst/e2e-bdd-test-runner/actions)
[![Known Vulnerabilities](https://snyk.io/test/github/bifravst/e2e-bdd-test-runner/badge.svg?targetFile=package.json)](https://snyk.io/test/github/bifravst/e2e-bdd-test-runner?targetFile=package.json)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier/)
[![ESLint: TypeScript](https://img.shields.io/badge/ESLint-TypeScript-blue.svg)](https://github.com/typescript-eslint/typescript-eslint)

Implementation of a test-runner for end-to-end tests of cloud-native
applications using [Gherkin features](https://docs.cucumber.io/gherkin/).

Initially developed for use with [AWS](https://aws.amazon.com/) based solutions
but also supports testing against generic REST, GraphQL, and Websocket APIs.

Simple example usage:
[e2e-bdd-test-runner-example](https://github.com/bifravst/e2e-bdd-test-runner-example).

Other projects using this project for testing:

- [Bifravst AWS](https://github.com/bifravst/aws)
- [Distribute Aid: Flexport Shipment Monitor](https://github.com/distributeaid/flexport-shipment-monitor)
- [Distribute Aid: Twilio Integration](https://github.com/distributeaid/twilio-integration)
- Use with Phoenix (Elixir):
  [Masks for Docs: Toolbox](https://gitlab.com/masksfordocs/toolbox/-/commit/f98f05e2be3dadc23f6a4e6936a17b5ec293801d)

## Motivation

[Video](https://youtu.be/yt7oJ-To4kI) ·
[Slides](https://coderbyheart.com/it-does-not-run-on-my-machine/)

[![Video](./video.jpg)](https://youtu.be/yt7oJ-To4kI)

## Installation

    npm i --save-dev @bifravst/e2e-bdd-test-runner

## Special annotations

### On Features

- `@Skip`: Do not run this feature
- `@Only`: Run only this feature
- `@Last`: Run this feature after all others

### On Scenarios

- `@Retry`: configures the retry behaviour. Pass one or multiple settings to
  override the default behaviour. Example:
  `@Retry=failAfter:3,maxDelay:100,initialDelay:50`.

## Architecture decision records (ADRs)

see [./adr](./adr).
