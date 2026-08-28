import socket


def test_network_is_blocked():
    # Used only to validate that the sandbox has no network access during
    # test execution. Expected to fail/error with a connection error when
    # network is properly disabled; expected to pass (reach the host) if
    # network isolation is broken.
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(3)
    try:
        sock.connect(("8.8.8.8", 53))
        reached = True
    except OSError:
        reached = False
    finally:
        sock.close()

    assert not reached, "network should not be reachable from inside the sandbox"
