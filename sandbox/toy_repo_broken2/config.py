class Config:
    """As of v3.0 of this (vendored) config library, `get_value` was
    renamed to `value`, for consistency with the rest of the API.
    """

    def __init__(self, data):
        self._data = data

    def value(self, key, default=None):
        return self._data.get(key, default)
