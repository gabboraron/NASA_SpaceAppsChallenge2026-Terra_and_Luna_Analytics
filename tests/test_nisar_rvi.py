from pollination.nasa.nisar import calculate_rvi


def test_calculate_rvi() -> None:
    assert calculate_rvi(3.0, 1.0) == 1.0
