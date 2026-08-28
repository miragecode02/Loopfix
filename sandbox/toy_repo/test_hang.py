import time


def test_hangs_forever():
    # Used only to validate that the sandbox's hard timeout actually
    # kills a runaway test run. Not part of the normal test suite.
    time.sleep(600)
