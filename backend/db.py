# Mongo connection + designs collection access. No simulation math here —
# this only persists/retrieves Graph payloads the engine already validated.

from __future__ import annotations

import os

from motor.motor_asyncio import AsyncIOMotorClient


class MongoNotConfiguredError(RuntimeError):
    """Raised when MONGO_URI isn't set on the server."""


_client: AsyncIOMotorClient | None = None


def get_designs_collection():
    """Lazily creates the Mongo client on first use and returns the designs collection."""
    global _client
    if _client is None:
        mongo_uri = os.environ.get("MONGO_URI")
        if not mongo_uri:
            raise MongoNotConfiguredError("MONGO_URI is not set on the server.")
        _client = AsyncIOMotorClient(mongo_uri)
    return _client["sysdesign"]["designs"]
