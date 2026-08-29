"""
Trimmed slice of Flask-Login's real test suite (see ATTRIBUTION.md) —
kept to TestLoginUrlGeneration, the class that exercises login_url()/
make_next_param(), the only code path in this vendored slice that
touches werkzeug.urls.
"""
import unittest

from flask import Flask
from flask_login import LoginManager
from flask_login import login_url
from flask_login import make_next_param


class TestLoginUrlGeneration(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.login_manager = LoginManager()
        self.login_manager.init_app(self.app)

        @self.app.route("/login")
        def login():
            return ""

    def test_make_next_param(self):
        with self.app.test_request_context():
            url = make_next_param("/login", "http://localhost/profile")
            self.assertEqual("/profile", url)

            url = make_next_param("https://localhost/login", "http://localhost/profile")
            self.assertEqual("http://localhost/profile", url)

    def test_login_url_generation(self):
        with self.app.test_request_context():
            PROTECTED = "http://localhost/protected"

            self.assertEqual(
                "/login?n=%2Fprotected", login_url("/login", PROTECTED, "n")
            )

            url = login_url("/login", PROTECTED)
            self.assertEqual("/login?next=%2Fprotected", url)

            self.assertEqual(
                "/login?affil=cgnu&next=%2Fprotected",
                login_url("/login?affil=cgnu", PROTECTED),
            )

    def test_login_url_no_next_url(self):
        self.assertEqual(login_url("/foo"), "/foo")
