# -*- coding: utf-8 -*-
"""
    tests.test_jwt

    Trimmed slice of Flask-JWT's real test suite (see ATTRIBUTION.md) —
    kept to the tests that exercise the default auth endpoint.
"""
from flask import json


def post_json(client, url, data):
    data = json.dumps(data)
    resp = client.post(url, headers={'Content-Type': 'application/json'}, data=data)
    return resp, json.loads(resp.data)


def test_initialize():
    from flask import Flask
    import flask_jwt

    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'super-secret'
    jwt = flask_jwt.JWT(app, lambda: None, lambda: None)
    assert isinstance(jwt, flask_jwt.JWT)
    assert len(app.url_map._rules) == 2


def test_auth_endpoint_with_valid_request(client, user):
    resp, jdata = post_json(
        client, '/auth', {'username': user.username, 'password': user.password})
    assert resp.status_code == 200
    assert 'access_token' in jdata


def test_auth_endpoint_with_invalid_credentials(client):
    resp, jdata = post_json(
        client, '/auth', {'username': 'bogus', 'password': 'bogus'})

    assert resp.status_code == 401
    assert 'error' in jdata
    assert jdata['error'] == 'Bad Request'
