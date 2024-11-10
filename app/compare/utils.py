import asyncio
from typing import AsyncGenerator
import logging

logger = logging.getLogger(__name__)

def convert_async_to_sync(async_gen):
    """Convert async generator to sync generator for Flask response."""
    loop = asyncio.new_event_loop()
    try:
        asyncio.set_event_loop(loop)
        while True:
            try:
                yield loop.run_until_complete(async_gen.__anext__())
            except StopAsyncIteration:
                break
    finally:
        loop.close()