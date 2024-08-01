import unittest
from unittest.mock import Mock
from app.integration.identity import get_user_id, easyauth_enabled

class TestIdentity(unittest.TestCase):

    def test_get_user_id_with_header(self):
        mock_request = Mock()
        mock_request.headers = {'X-MS-CLIENT-PRINCIPAL-NAME': 'test_user@example.com'}
        
        result = get_user_id(mock_request)
        
        self.assertEqual(result, 'test_user@example.com')

    def test_get_user_id_without_header(self):
        mock_request = Mock()
        mock_request.headers = {}
        
        result = get_user_id(mock_request)
        
        self.assertEqual(result, "163e5568-589b-12d3-5454-426614174063")

    def test_easyauth_enabled_true(self):
        mock_request = Mock()
        mock_request.headers = {'X-MS-CLIENT-PRINCIPAL-NAME': 'test_user@example.com'}
        
        result = easyauth_enabled(mock_request)
        
        self.assertTrue(result)

    def test_easyauth_enabled_false(self):
        mock_request = Mock()
        mock_request.headers = {}
        
        result = easyauth_enabled(mock_request)
        
        self.assertFalse(result)

if __name__ == '__main__':
    unittest.main()