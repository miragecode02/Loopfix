from flask import Flask

from flask_script import Manager


def test_manager_wraps_app():
    app = Flask(__name__)
    manager = Manager(app)
    assert manager.app is app
