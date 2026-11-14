"""In-memory grower verification state (plan D16); it is lost on restart."""

from pollination.models import Provenance

PHOTO_SOURCE = "Grower field photo (simulated)"

verifications: dict[str, Provenance] = {}
"""Bloom verification by parcel id; the timeline applies it to blooming weeks."""
