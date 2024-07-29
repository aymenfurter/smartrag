import logging
from graphrag.config import create_graphrag_config
from graphrag.index import create_pipeline_config
from graphrag.index.run import run_pipeline_with_config
from graphrag.index.progress import PrintProgressReporter
from app.integration.graphrag_config import GraphRagConfig

logger = logging.getLogger(__name__)

class GraphRagIngestion:
    def __init__(self, config: GraphRagConfig):
        self.config = config

    async def process(self):
        config = self.config.get_config()
        parameters = create_graphrag_config(config, ".")
        pipeline_config = create_pipeline_config(parameters, True)

        logger.info(f"Starting GraphRAG processing for index: {self.config.index_name}")
        async for workflow_result in run_pipeline_with_config(
            config_or_path=pipeline_config,
            progress_reporter=PrintProgressReporter("Running GraphRAG pipeline..."),
        ):
            if workflow_result.errors:
                logger.error(f"Errors found in GraphRAG workflow result for index {self.config.index_name}: {workflow_result.errors}")
            else:
                logger.info(f"GraphRAG processing completed successfully for index: {self.config.index_name}")