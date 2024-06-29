import unittest
from unittest.mock import patch, MagicMock
from app.research import create_agent, create_reviewer_agent, create_user_proxy, search, generate_final_conclusion, research_with_data

class TestResearch(unittest.TestCase):
    def test_create_user_proxy(self):
        user_proxy = create_user_proxy()
        self.assertEqual(user_proxy.name, "Admin")
        self.assertEqual(user_proxy.human_input_mode, "NEVER")

    @patch('app.research.requests.post')
    def test_search(self, mock_post):
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [{"message": {"content": "Test content", "context": {"citations": []}}}]
        }
        mock_post.return_value = mock_response
        
        result = search("test query", "test_index")
        self.assertEqual(result, "Test content")

    @patch('app.research.requests.post')
    def test_generate_final_conclusion(self, mock_post):
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [{"message": {"content": "Final conclusion"}}]
        }
        mock_post.return_value = mock_response
        
        chat_result = MagicMock()
        chat_result.chat_history = [{"role": "user", "content": "Test"}]
        
        result = generate_final_conclusion(chat_result)
        self.assertEqual(result, "Final conclusion")

if __name__ == '__main__':
    unittest.main()