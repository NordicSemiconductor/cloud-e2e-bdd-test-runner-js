Feature: Creating random numbers

  Scenario: Create random numbers

    Given I store a random number between 100 and 1000 into "mcc"
    Then "mcc >= 100" should be true
    And "mcc <= 1000" should be true
