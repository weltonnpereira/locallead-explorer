import re
import unicodedata

_CONTROL_CHARS = re.compile(r"[\u0000-\u001f\u007f-\u009f\u200b\u200c\u200d\ufeff]")
_HTML_TAGS = re.compile(r"<[^>]*>")
_MULTIPLE_SPACES = re.compile(r"\s+")

def sanitize_text(value: str, *, max_length: int) -> str:
    value = unicodedata.normalize("NFKC", value)
    value = _HTML_TAGS.sub(" ", value)
    value = _CONTROL_CHARS.sub("", value)
    value = _MULTIPLE_SPACES.sub(" ", value).strip()
    return value[:max_length]


def sanitize_search_term(value: str) -> str:
    sanitized = sanitize_text(value, max_length=120)
    if not sanitized:
        raise ValueError("O termo de busca é obrigatório.")
    return sanitized


def sanitize_city(value: str) -> str:
    sanitized = sanitize_text(value, max_length=120)
    if not sanitized:
        raise ValueError("A cidade é obrigatória.")
    return sanitized


def sanitize_business_name(value: str | None) -> str | None:
    if not value:
        return None
    sanitized = sanitize_text(value, max_length=200)
    return sanitized or None
