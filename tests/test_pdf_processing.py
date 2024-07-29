import unittest
from unittest.mock import patch, MagicMock
from app.ingestion.pdf_processing import convert_pdf_page_to_png

class TestPdfProcessing(unittest.TestCase):

    @patch('app.ingestion.pdf_processing.convert_from_path')
    @patch('app.ingestion.pdf_processing.os.path.exists')
    def test_convert_pdf_page_to_png(self, mock_exists, mock_convert):
        mock_exists.return_value = True
        mock_image = MagicMock()
        mock_convert.return_value = [mock_image]

        result = convert_pdf_page_to_png("test.pdf", 0, "/output", "test")
        self.assertIsNotNone(result)
        mock_image.save.assert_called_once()

    @patch('app.ingestion.pdf_processing.os.path.exists')
    def test_convert_pdf_page_to_png_file_not_exists(self, mock_exists):
        mock_exists.return_value = False

        with self.assertRaises(ValueError):
            convert_pdf_page_to_png("nonexistent.pdf", 0, "/output", "test")

if __name__ == '__main__':
    unittest.main()