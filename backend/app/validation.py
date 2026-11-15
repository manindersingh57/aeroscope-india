import math
from flask import request
from .errors import APIError


def number_arg(key, *, required=False, minimum=None, maximum=None):
    raw = request.args.get(key)
    if raw is None:
        if required:
            raise APIError(f"Missing required query parameter: {key}")
        return None
    try:
        value = float(raw)
    except (ValueError, TypeError):
        raise APIError(f"{key} must be a number")
    if not math.isfinite(value):
        raise APIError(f"{key} must be finite")
    if minimum is not None and value < minimum:
        raise APIError(f"{key} must be >= {minimum}")
    if maximum is not None and value > maximum:
        raise APIError(f"{key} must be <= {maximum}")
    return value


def integer_arg(key, *, default=None, minimum=None, maximum=None):
    raw = request.args.get(key)
    if raw is None:
        return default
    try:
        value = int(raw)
    except (ValueError, TypeError):
        raise APIError(f"{key} must be an integer")
    if minimum is not None and value < minimum:
        raise APIError(f"{key} must be >= {minimum}")
    if maximum is not None and value > maximum:
        raise APIError(f"{key} must be <= {maximum}")
    return value


def validate_model(model):
    if model not in {"model_a", "model_b"}:
        raise APIError("model must be 'model_a' or 'model_b'", 400, "invalid_model")
    return model
