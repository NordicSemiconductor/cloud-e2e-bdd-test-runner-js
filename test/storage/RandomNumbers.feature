Feature: Creating random numbers

  Scenario: Create positive random numbers

    Given I store a random number between 100 and 1000 into "pos"
    Then "pos >= 100" should be true
    And "pos <= 1000" should be true

  Scenario: Create negative random numbers

    Given I store a random number between -90 and -80 into "neg"
    Then "neg >= -90" should be true
    And "neg <= -80" should be true

  Scenario: Numbers should be different

    Given I store a random number between 0 and 1000000 into "rand1"
    And I store a random number between 0 and 1000000 into "rand2"
    Then "rand1 = rand2" should be false