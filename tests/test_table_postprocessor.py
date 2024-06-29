import unittest
from unittest.mock import patch
from unittest import mock 
from app.table_postprocessor import *

class TestTablePostprocessor(unittest.TestCase):
    def test_basic_extraction(self):
        markdown_content = "| ID | Name |\n|----|----- |\n| 1  | John |\n\nSome text here.\n| A | B |\n|---|---|\n| 2 | 3 |\n\n"
        expected_output = ["| ID | Name |\n|----|----- |\n| 1  | John |\n\n", "| A | B |\n|---|---|\n| 2 | 3 |\n\n"]
        self.assertEqual(extract_tables(markdown_content), expected_output)

    def test_no_tables_in_content(self):
        markdown_content = "This is some text without tables."
        expected_output = []
        self.assertEqual(extract_tables(markdown_content), expected_output)

    def test_tables_with_additional_text_and_newlines(self):
        markdown_content = "Some intro text.\n\n| Col1 | Col2 |\n|------|------|\n| Val1 | Val2 |\n\nMore text.\n\n| X | Y |\n|---|---|\n| 5 | 6 |\n\n"
        expected_output = ["| Col1 | Col2 |\n|------|------|\n| Val1 | Val2 |\n\n", "| X | Y |\n|---|---|\n| 5 | 6 |\n\n"]
        self.assertEqual(extract_tables(markdown_content), expected_output)

    def test_tables_without_trailing_newlines(self):
        markdown_content = "| A | B |\n|---|---|\n| 1 | 2 |\n"
        expected_output = ["| A | B |\n|---|---|\n| 1 | 2 |\n\n"]
        self.assertEqual(extract_tables(markdown_content), expected_output)

    def test_nested_tables_robustness(self):
        markdown_content = "| Outer | Table |\n|-------|-------|\n| A     | B     |\n\n| Inner | Table |\n|-------|-------|\n| C     | D     |\n\n"
        expected_output = ["| Outer | Table |\n|-------|-------|\n| A     | B     |\n\n", "| Inner | Table |\n|-------|-------|\n| C     | D     |\n\n"]
        self.assertEqual(extract_tables(markdown_content), expected_output)

    @patch('app.table_postprocessor.llm')
    def test_generate_table_summary(self, mock_llm):
        # Test 1: Basic table summary
        mock_llm.return_value = "This is a summary of the table."
        table_content = "| ID | Name |\n|----|----- |\n| 1  | John |"
        expected_output = "\n\n<!-- Table Summary: This is a summary of the table. -->\n"
        self.assertEqual(generate_table_summary(table_content), expected_output)

        # Test 2: Empty table
        mock_llm.return_value = "This is an empty table."
        table_content = "| ID | Name |\n|----|----- |\n"
        expected_output = "\n\n<!-- Table Summary: This is an empty table. -->\n"
        self.assertEqual(generate_table_summary(table_content), expected_output)

        # Test 3: Large table
        mock_llm.return_value = "This is a summary of a large table."
        table_content = "| ID | Name | Age |\n|----|------|-----|\n" + "\n".join([f"| {i} | Name{i} | {20+i} |" for i in range(100)])
        expected_output = "\n\n<!-- Table Summary: This is a summary of a large table. -->\n"
        self.assertEqual(generate_table_summary(table_content), expected_output)

        # Test 4: Table with special characters
        mock_llm.return_value = "This table contains special characters."
        table_content = "| ID | Name |\n|----|----- |\n| 1  | @John! |"
        expected_output = "\n\n<!-- Table Summary: This table contains special characters. -->\n"
        self.assertEqual(generate_table_summary(table_content), expected_output)

        # Test 5: Table with multiline content
        mock_llm.return_value = "This table contains multiline content."
        table_content = "| ID | Description |\n|----|-------------|\n| 1  | Line1\nLine2 |"
        expected_output = "\n\n<!-- Table Summary: This table contains multiline content. -->\n"
        self.assertEqual(generate_table_summary(table_content), expected_output)

    @patch('app.table_postprocessor.llm')
    def test_generate_qa_pairs(self, mock_llm):
        # Test 1: Basic Q&A pair generation
        mock_llm.return_value = "Q1: What is John's age?\nA1: 30"
        table_content = "| ID | Name | Age |\n|----|------|-----|\n| 1  | John | 30  |"
        expected_output = '\n\n<!-- Q&A Pairs:\nQ1: What is John\'s age?\nA1: 30\n-->\n'
        self.assertEqual(generate_qa_pairs(table_content), expected_output)

        # Test 2: Multiple Q&A pairs
        mock_llm.return_value = "Q1: What is John's age?\nA1: 30\nQ2: What is Alice's age?\nA2: 25"
        table_content = "| ID | Name | Age |\n|----|------|-----|\n| 1  | John | 30  |\n| 2  | Alice | 25  |"
        expected_output = '\n\n<!-- Q&A Pairs:\nQ1: What is John\'s age?\nA1: 30\nQ2: What is Alice\'s age?\nA2: 25\n-->\n'
        self.assertEqual(generate_qa_pairs(table_content), expected_output)

        # Test 3: No Q&A pairs generated
        mock_llm.return_value = ""
        table_content = "| ID | Name | Age |\n|----|------|-----|\n| 1  | John | 30  |"
        expected_output = '\n\n<!-- Q&A Pairs:\n\n-->\n'
        self.assertEqual(generate_qa_pairs(table_content), expected_output)

        # Test 4: Q&A pairs with special characters
        mock_llm.return_value = "Q1: What is John@'s age?\nA1: 30"
        table_content = "| ID | Name | Age |\n|----|------|-----|\n| 1  | John@ | 30  |"
        expected_output = '\n\n<!-- Q&A Pairs:\nQ1: What is John@\'s age?\nA1: 30\n-->\n'
        self.assertEqual(generate_qa_pairs(table_content), expected_output)

        # Test 5: Q&A pairs for large tables
        mock_llm.return_value = "Q1: What is the age of the person in row 1?\nA1: 21\nQ2: What is the age of the person in row 100?\nA2: 120"
        table_content = "| ID | Name | Age |\n|----|------|-----|\n" + "\n".join([f"| {i} | Name{i} | {20+i} |" for i in range(100)])
        expected_output = '\n\n<!-- Q&A Pairs:\nQ1: What is the age of the person in row 1?\nA1: 21\nQ2: What is the age of the person in row 100?\nA2: 120\n-->\n'
        self.assertEqual(generate_qa_pairs(table_content), expected_output)

        @mock.patch('path.to.your.module.llm')  # Correct the path to match your module structure
        def test_generate_row_descriptions(self, mock_llm):
            # Dynamic mock response function
            def mock_description(prompt):
                if "John" in prompt:
                    return "This row describes John who is 30 years old."
                elif "Alice" in prompt:
                    return "This row describes Alice who is 25 years old."
                elif "@" in prompt:
                    return "This row describes John who has a special character in the name."
                elif "Line1" in prompt:
                    return "This row describes an entry with multiline content."
                else:
                    return "This row is empty."
            
            # Use the function directly as side_effect
            mock_llm.side_effect = mock_description

            # Test cases remain unchanged
            table_content = "| ID | Name | Age |\n|----|------|-----|\n| 1  | John | 30  |"
            expected_output = """| ID | Name | Age |
    |----|------|-----|
    | 1  | John | 30  |
    <!-- Row Description: This row describes John who is 30 years old. -->"""
            self.assertEqual(generate_row_descriptions(table_content), expected_output)

            table_content = "| ID | Name | Age |\n|----|------|-----|\n| 1  | John | 30  |\n| 2  | Alice | 25  |"
            expected_output = """| ID | Name | Age |
    |----|------|-----|
    | 1  | John | 30  |
    <!-- Row Description: This row describes John who is 30 years old. -->
    | 2  | Alice | 25  |
    <!-- Row Description: This row describes Alice who is 25 years old. -->"""
            self.assertEqual(generate_row_descriptions(table_content), expected_output)

            table_content = "| ID | Name | Age |\n|----|------|-----|\n|    |      |     |"
            expected_output = """| ID | Name | Age |
    |----|------|-----|
    |    |      |     |
    <!-- Row Description: This row is empty. -->"""
            self.assertEqual(generate_row_descriptions(table_content), expected_output)

            table_content = "| ID | Name | Age |\n|----|------|-----|\n| 1  | John@ | 30  |"
            expected_output = """| ID | Name | Age |
    |----|------|-----|
    | 1  | John@ | 30  |
    <!-- Row Description: This row describes John who has a special character in the name. -->"""
            self.assertEqual(generate_row_descriptions(table_content), expected_output)

            table_content = "| ID | Description |\n|----|-------------|\n| 1  | Line1\nLine2 |"
            expected_output = """| ID | Description |
    |----|-------------|
    | 1  | Line1
    Line2 |
    <!-- Row Description: This row describes an entry with multiline content. -->"""
            self.assertEqual(generate_row_descriptions(table_content), expected_output)

if __name__ == '__main__':
    unittest.main()
