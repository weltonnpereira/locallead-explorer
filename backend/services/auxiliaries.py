from typing import Optional


def parse_currency_to_cents(value: any) -> Optional[int]:
    """Converte qualquer formato de entrada monetária para centavos (inteiro)."""
    if value is None:
        return None

    if isinstance(value, int):
        return value

    if isinstance(value, float):
        return int(round(value * 100))

    if isinstance(value, str):
        cleaned = value.replace("R$", "").replace("$", "").replace(",", ".").strip()
        if not cleaned:
            return None

        if "," in cleaned and "." in cleaned:
            cleaned = cleaned.replace(".", "").replace(",", ".")
        elif "," in cleaned:
            cleaned = cleaned.replace(",", ".")

        try:
            float_value = float(cleaned)
            return int(round(float_value * 100))
        except ValueError:
            raise ValueError(f"Não foi possível converter '{value}' para centavos.")

    raise TypeError(f"Tipo de entrada não suportado: {type(value)}")