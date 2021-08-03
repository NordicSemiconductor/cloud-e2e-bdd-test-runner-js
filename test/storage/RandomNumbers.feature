Feature: Creating random numbers

  Scenario: Create positive random numbers

    Given I store a random number between 100 and 1000 into "pos"
    Then "pos >= 100" should be true
    And "pos <= 1000" should be true

  Scenario: Create negative random numbers

    Given I store a random number between -90 and -80 into "neg"
    Then "neg >= -90" should be true
    And "neg <= -80" should be true
