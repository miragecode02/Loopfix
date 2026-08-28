from settings import get_timeout


def test_get_timeout_returns_default():
    assert get_timeout({}) == 30
