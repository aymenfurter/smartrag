import unittest
from app.utils import get_user_id

class TestGetUserId(unittest.TestCase):
	def test_get_user_id_with_header(self):
		class RequestMock:
			def __init__(self, headers):
				self.headers = headers
		
		request_with_header = RequestMock({'CLIENT-PRINCIPAL-ID': 'test-user-id'})
		self.assertEqual(get_user_id(request_with_header), 'test-user-id')
		
		request_without_header = RequestMock({})
		self.assertEqual(get_user_id(request_without_header), "163e5568-589b-12d3-5454-426614174063")

if __name__ == '__main__':
	unittest.main()