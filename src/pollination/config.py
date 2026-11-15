"""Runtime configuration for the pollination service."""

from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Load optional Earthdata credentials, storage paths, and the pilot region."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    earthdata_token: SecretStr | None = None
    cache_dir: Path = Path(".cache")
    data_dir: Path = Path("data")
    # Geographic bounds are ordered west, south, east, north.
    bbox: tuple[float, float, float, float] = (21.6, 47.7, 22.4, 48.05)
    # Drawn polygons have no crop: a generic heat-unit base (deg C).
    gdd_base_temp_c: float = 5.0
    # Bee-flight weather (WP13): a day counts when Tmax is at least this (deg C) ...
    bee_flight_min_tmax_c: float = 15.0
    # ... and the 2 m wind is below this (m/s). An assumption, not a sourced value.
    bee_flight_max_wind_ms: float = 6.0

    @property
    def has_earthdata(self) -> bool:
        """Whether an Earthdata token is configured (an empty value is not one)."""
        token = self.earthdata_token
        return token is not None and bool(token.get_secret_value().strip())
