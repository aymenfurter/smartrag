import asyncio
import logging
from typing import Dict, Any
from app.ingestion.graphrag_ingestion import GraphRagIngestion
from app.integration.graphrag_config import GraphRagConfig
from app.integration.ingestion_job_api import IngestionJobApi
from .indexing_queue import AzureClientManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class IndexingJobSettings:
    INDEXING_TABLE_NAME = "indexing"
    SLEEP_TIME = 60
    COMPLETED_STATUS = "completed"
    FAILED_STATUS = "failed"
    ERROR_STATUS = "error"
    IN_PROGRESS_STATUS = "in_progress"

class IndexingJobManager:
    def __init__(self):
        self.ingestion_job_api = IngestionJobApi()
        self.table_client = AzureClientManager.initialize_table_client(IndexingJobSettings.INDEXING_TABLE_NAME)

    def create_ingestion_job(self, container_name: str) -> Dict[str, Any]:
        return self.ingestion_job_api.create_ingestion_job(container_name)

    def check_ingestion_job_status(self, job_id: str) -> Dict[str, Any]:
        status = self.ingestion_job_api.get_api_status(job_id)
        return {"status": status, "message": f"Indexing job {status}"} if status != IndexingJobSettings.ERROR_STATUS else {"status": IndexingJobSettings.ERROR_STATUS, "message": "Error checking job status"}

    def check_job_status(self, job_id: str) -> Dict[str, Any]:
        table_status = self.table_client.get_entity("indexing", job_id)['status']
        api_status = self.ingestion_job_api.get_api_status(job_id)

        if table_status == IndexingJobSettings.COMPLETED_STATUS and api_status == IndexingJobSettings.COMPLETED_STATUS:
            return {"status": IndexingJobSettings.COMPLETED_STATUS, "message": "Job completed successfully"}
        elif table_status == IndexingJobSettings.FAILED_STATUS or api_status == IndexingJobSettings.FAILED_STATUS:
            return {"status": IndexingJobSettings.FAILED_STATUS, "message": "Job failed"}
        elif api_status == IndexingJobSettings.ERROR_STATUS:
            return {"status": IndexingJobSettings.ERROR_STATUS, "message": "Error checking job status"}
        else:
            return {"status": IndexingJobSettings.IN_PROGRESS_STATUS, "message": "Job is still in progress"}

    def delete_ingestion_index(self, job_id: str) -> Dict[str, Any]:
        return self.ingestion_job_api.delete_ingestion_index(job_id)

    def update_job_status(self, job_id: str, status: str):
        self.table_client.update_entity({"PartitionKey": "indexing", "RowKey": job_id, "status": status})

    async def process_indexing_job(self, job_info: Dict[str, Any]):
        job_id = job_info['job_id']
        container_name = job_info['container_name']
        user_id = job_info['user_id']
        index_name = job_info['index_name']
        is_restricted = job_info['is_restricted']

        try:
            self.update_job_status(job_id, "ingestion_started")
            self.create_ingestion_job(container_name)
            self.update_job_status(job_id, "graphrag_started")
            
            config = GraphRagConfig(index_name, user_id, is_restricted)
            ingestion = GraphRagIngestion(config)
            await ingestion.process()
            
            self.update_job_status(job_id, "graphrag_completed")
            
            while True:
                status = self.check_ingestion_job_status(job_id)
                if status['status'] in [IndexingJobSettings.COMPLETED_STATUS, IndexingJobSettings.FAILED_STATUS]:
                    break
                await asyncio.sleep(IndexingJobSettings.SLEEP_TIME)
            
            self.update_job_status(job_id, status['status'])
            logger.info(f"{'Completed' if status['status'] == IndexingJobSettings.COMPLETED_STATUS else 'Failed'} indexing job for container: {container_name}")
            
            await asyncio.sleep(IndexingJobSettings.SLEEP_TIME)
            self.table_client.delete_entity("indexing", job_id)
        except Exception as e:
            logger.error(f"Error processing indexing job: {str(e)}")
            self.update_job_status(job_id, IndexingJobSettings.FAILED_STATUS)

job_manager = IndexingJobManager()

def create_ingestion_job(container_name: str) -> Dict[str, Any]:
    return job_manager.create_ingestion_job(container_name)

def check_ingestion_job_status(job_id: str) -> Dict[str, Any]:
    return job_manager.check_ingestion_job_status(job_id)

def check_job_status(job_id: str) -> Dict[str, Any]:
    return job_manager.check_job_status(job_id)

def delete_ingestion_index(job_id: str) -> Dict[str, Any]:
    return job_manager.delete_ingestion_index(job_id)

def update_job_status(job_id: str, status: str):
    job_manager.update_job_status(job_id, status)

async def process_indexing_job(job_info: Dict[str, Any]):
    await job_manager.process_indexing_job(job_info)