import unittest
from unittest.mock import patch, MagicMock
from app.research import create_agent, create_reviewer_agent, create_user_proxy, search, generate_final_conclusion, research_with_data

class TestResearch(unittest.TestCase):
    def test_create_user_proxy(self):
        user_proxy = create_user_proxy()
        self.assertEqual(user_proxy.name, "Admin")
        self.assertEqual(user_proxy.human_input_mode, "NEVER")

if __name__ == '__main__':
    unittest.main()