from flask import Flask

from flask_cache import Cache


def test_cache_init_app_with_simple_backend():
    app = Flask(__name__)
    app.config["CACHE_TYPE"] = "simple"
    cache = Cache(app)
    cache.set("key", "value")
    assert cache.get("key") == "value"
