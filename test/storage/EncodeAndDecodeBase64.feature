Feature: Encoding and decoding base64

  Scenario: Encode a string using base64

    When I encode this payload into "escapedBase64" using base64
      """
      Some string
      """
    Then "escapedBase64" should equal "U29tZSBzdHJpbmc="

  Scenario: Decode a base64 encoded string

    When I decode this payload into "decodedBase64" using base64
      """
      U29tZSBzdHJpbmc=
      """
    Then "decodedBase64" should equal "Some string"
