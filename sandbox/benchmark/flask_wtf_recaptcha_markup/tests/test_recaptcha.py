"""
Trimmed slice of Flask-WTF's real recaptcha test suite (see
ATTRIBUTION.md) — kept to the tests that render the widget, the only
code path in this vendored slice that touches flask.Markup.
"""
import pytest

from flask_wtf import FlaskForm
from flask_wtf.recaptcha import RecaptchaField


class RecaptchaForm(FlaskForm):
    class Meta:
        csrf = False

    recaptcha = RecaptchaField()


@pytest.fixture
def app(app):
    app.testing = False
    app.config["PROPAGATE_EXCEPTIONS"] = True
    app.config["RECAPTCHA_PUBLIC_KEY"] = "public"
    app.config["RECAPTCHA_PRIVATE_KEY"] = "private"
    return app


@pytest.fixture(autouse=True)
def req_ctx(app):
    with app.test_request_context(data={"g-recaptcha-response": "pass"}) as ctx:
        yield ctx


def test_render_has_js():
    f = RecaptchaForm()
    render = f.recaptcha()
    assert "https://www.google.com/recaptcha/api.js" in render


def test_render_custom_div_class(app):
    div_class = "h-captcha"
    app.config["RECAPTCHA_DIV_CLASS"] = div_class
    f = RecaptchaForm()
    render = f.recaptcha()
    assert div_class in render
