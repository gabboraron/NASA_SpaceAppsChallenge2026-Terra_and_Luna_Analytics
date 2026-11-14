from pathlib import Path

from pollination.nasa.cache import get_or_fetch


def test_second_call_does_not_fetch(tmp_path: Path) -> None:
    calls: list[int] = []

    def fetch() -> dict[str, int]:
        calls.append(1)
        return {"v": 1}

    key = {"lat": 48.0, "lon": 22.0}
    assert get_or_fetch("power", key, fetch, tmp_path) == {"v": 1}
    assert get_or_fetch("power", {"lon": 22.0, "lat": 48.0}, fetch, tmp_path) == {
        "v": 1
    }
    assert len(calls) == 1


def test_corrupted_file_is_refetched(tmp_path: Path) -> None:
    key = {"a": 1}
    get_or_fetch("ns", key, lambda: {"v": 1}, tmp_path)
    (file,) = (tmp_path / "ns").glob("*.json")
    file.write_text("{not json", encoding="utf-8")
    assert get_or_fetch("ns", key, lambda: {"v": 2}, tmp_path) == {"v": 2}


def test_namespaces_and_keys_are_isolated(tmp_path: Path) -> None:
    get_or_fetch("a", {"k": 1}, lambda: {"v": "a"}, tmp_path)
    assert get_or_fetch("b", {"k": 1}, lambda: {"v": "b"}, tmp_path) == {"v": "b"}
    assert get_or_fetch("a", {"k": 2}, lambda: {"v": "c"}, tmp_path) == {"v": "c"}
