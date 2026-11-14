"""Runtime configuration for the pollination service."""

from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Load optional Earthdata credentials, storage paths, and the pilot region."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    earthdata_username: str | None = None
    earthdata_password: SecretStr | None = None
    earthdata_token: SecretStr | None = None
    cache_dir: Path = Path(".cache")
    data_dir: Path = Path("data")
    # Geographic bounds are ordered west, south, east, north.
    bbox: tuple[float, float, float, float] = (21.6, 47.7, 22.4, 48.05)
