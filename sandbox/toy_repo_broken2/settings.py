from config import Config


def get_timeout(raw_settings):
    # Written against config v2.x, where the lookup method was
    # called `get_value`.
    cfg = Config(raw_settings)
    return cfg.get_value("timeout", 30)
