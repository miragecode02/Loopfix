from pricing import apply_discount


def checkout_total(price, discount_percent):
    # Written against pricing v1.x, where `rounding` was the third
    # positional argument.
    return apply_discount(price, discount_percent, 2)
