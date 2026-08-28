from checkout import checkout_total


def test_checkout_total_rounds_to_two_decimals():
    assert checkout_total(19.99, 10) == 17.99
