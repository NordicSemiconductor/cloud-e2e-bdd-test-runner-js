Feature: Escaping and parsing JSON

  Scenario: Escape a JSON string (double JSON.stringify)

    When I encode this payload into "escapedJSON" using JSON
      """
      {"baz":"foo","num":42,"b":true}
      """
  
  Scenario: Parsing a JSON string

    When I parse "escapedJSON" into "jsonString"
    Then "jsonString" should equal this JSON
      """
      "{\"baz\":\"foo\",\"num\":42,\"b\":true}"
      """
    When I parse "jsonString" into "json"
    Then "json" should equal this JSON
      """
      {"baz":"foo","num":42,"b":true}
      """
