# Why a fork?

The story behind this fork of
[@nrfcloud/bdd-feature-runner-aws](https://github.com/nRFCloud/bdd-feature-runner-aws)
is described
[here](https://github.com/nRFCloud/bdd-feature-runner-aws/commit/e935724393bf826251fbb52f9991b0bda5df4720#commitcomment-33390803).

Behavior (manipulation of REST response bodies) was added to deal with failing
tests in a **specific project**.

I strongly disagree that the test runner is the right place to fix unwanted
behavior of the system under test.

I don't want these hacks for a project which is designed as a general test
runner, so I forked it.

Maintaining a fork also proved to be a good choice, because I now have lost
access to the original repository two times.
