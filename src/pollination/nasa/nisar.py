"""Calculations for NISAR-derived indicators."""


def calculate_rvi(hh: float, hv: float) -> float:
    """Calculate dual-polarization RVI from HH and HV power values.

    Args:
        hh: Co-polarized HH backscatter power.
        hv: Cross-polarized HV backscatter power.

    Returns:
        The dual-polarization radar vegetation index.

    Raises:
        ValueError: If the combined backscatter is not positive.
    """
    denominator = hh + hv
    if denominator <= 0:
        raise ValueError("HH and HV must have a positive sum")
    return 4 * hv / denominator
