import unittest
from unittest.mock import Mock, patch, AsyncMock
import pandas as pd
from app.query.graphrag_query import GraphRagQuery
from app.integration.graphrag_config import GraphRagConfig

class TestGraphRagQuery(unittest.TestCase):

    def setUp(self):
        self.mock_config = Mock(spec=GraphRagConfig)
        self.mock_config.prefix = 'test-prefix'
        self.mock_config.index_name = 'test-index'
        self.mock_config.get_config.return_value = {
            "storage": {"connection_string": "test-connection-string"},
            "llm": {
                "api_base": "https://test-api-base.com",
                "model": "test-model",
                "deployment_name": "test-deployment",
                "api_version": "2023-05-15",
                "api_key": "test-api-key"
            }
        }
        self.query = GraphRagQuery(self.mock_config)

    @patch('app.query.graphrag_query.BlobServiceClient')
    @patch('app.query.graphrag_query.pq.read_table')
    def test_get_reports(self, mock_read_table, mock_blob_service_client):
        # Mock the blob client and its methods
        mock_blob_client = Mock()
        mock_blob_client.download_blob.return_value.readall.return_value = b'mock data'
        mock_blob_service_client.from_connection_string.return_value.get_blob_client.return_value = mock_blob_client

        # Mock the parquet reading
        mock_read_table.return_value.to_pandas.side_effect = [
            pd.DataFrame({'entity': [1, 2, 3]}),
            pd.DataFrame({'report': ['A', 'B', 'C']})
        ]

        entity_table_path = "abfs://test-prefix-test-index-grdata/output/create_final_nodes.parquet"
        community_report_table_path = "abfs://test-prefix-test-index-grdata/output/create_final_community_reports.parquet"

        report_df, entity_df = self.query.get_reports(entity_table_path, community_report_table_path, 2)

        self.assertIsInstance(report_df, pd.DataFrame)
        self.assertIsInstance(entity_df, pd.DataFrame)
        self.assertEqual(len(report_df), 3)
        self.assertEqual(len(entity_df), 3)

class TestGraphRagQueryAsync(unittest.IsolatedAsyncioTestCase):

    async def asyncSetUp(self):
        self.mock_config = Mock(spec=GraphRagConfig)
        self.mock_config.prefix = 'test-prefix'
        self.mock_config.index_name = 'test-index'
        self.mock_config.get_config.return_value = {
            "storage": {"connection_string": "test-connection-string"},
            "llm": {
                "api_base": "https://test-api-base.com",
                "model": "test-model",
                "deployment_name": "test-deployment",
                "api_version": "2023-05-15",
                "api_key": "test-api-key"
            }
        }
        self.query = GraphRagQuery(self.mock_config)

    @patch.object(GraphRagQuery, 'get_reports')
    @patch('app.query.graphrag_query.ChatOpenAI')
    @patch('app.query.graphrag_query.tiktoken.encoding_for_model')
    @patch('app.query.graphrag_query.GlobalSearch')
    @patch('app.query.graphrag_query.GlobalCommunityContext')
    @patch('app.query.graphrag_query.read_indexer_reports')
    async def test_global_query(self, mock_read_indexer_reports, mock_global_community_context, 
                                mock_global_search, mock_tiktoken, mock_chat_openai, mock_get_reports):
        # Mock the get_reports method
        mock_get_reports.return_value = (
            pd.DataFrame({'community': [1, 2], 'title': ['Report 1', 'Report 2'], 'content': ['Content 1', 'Content 2']}),
            pd.DataFrame({'entity': [1, 2, 3]})
        )

        # Mock the GlobalSearch.asearch method
        mock_search_result = Mock()
        mock_search_result.response = "Test response"
        mock_search_result.context_data = {
            "reports": pd.DataFrame({
                'title': ['test-index<sep>1<sep>Report 1', 'test-index<sep>2<sep>Report 2'],
                'content': ['Content 1', 'Content 2'],
                'rank': [0.9, 0.8]
            })
        }
        mock_global_search.return_value.asearch = AsyncMock(return_value=mock_search_result)

        result, context_data = await self.query.global_query("test query")

        self.assertEqual(result, "Test response")
        self.assertIsInstance(context_data, dict)
        self.assertIn("reports", context_data)
        self.assertIsInstance(context_data["reports"], list)
        self.assertEqual(len(context_data["reports"]), 2)
        self.assertEqual(context_data["reports"][0]["index_name"], "test-index")
        self.assertEqual(context_data["reports"][0]["index_id"], "1")
        self.assertEqual(context_data["reports"][0]["title"], "Report 1")

if __name__ == '__main__':
    unittest.main()