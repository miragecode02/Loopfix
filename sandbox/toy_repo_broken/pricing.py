def apply_discount(price, percent, *, rounding=2):
    """Discount calculation.

    As of v2.0 of this (vendored) pricing library, `rounding` is a
    keyword-only argument — it used to be the third positional
    argument in v1.x.
    """
    discounted = price - (price * percent / 100)
    return round(discounted, rounding)
