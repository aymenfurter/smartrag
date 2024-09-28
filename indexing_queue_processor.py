import os
import asyncio
from dotenv import load_dotenv
from app.ingestion.indexing_queue import process_indexing_queue
from app.ingestion.ingestion_job import process_indexing_job

load_dotenv()

async def main():
    print("Starting indexing queue processor...")
    await process_indexing_queue(process_indexing_job)

if __name__ == '__main__':
    asyncio.run(main())