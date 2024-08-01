import os
from typing import List
from app.integration.azure_openai import get_azure_openai_client, generate_completion

ENABLE_TABLE_SUMMARY = True
ENABLE_ROW_DESCRIPTIONS = False
ENABLE_QA_PAIRS = True

def enhance_markdown(markdown_content: str) -> str:
    """Enhance markdown content with additional information."""
    tables = extract_tables(markdown_content)
    enhanced_tables = [enhance_table(table) for table in tables]
    
    for original, enhanced in zip(tables, enhanced_tables):
        markdown_content = markdown_content.replace(original, enhanced)
    
    return markdown_content

def extract_tables(markdown_content: str) -> List[str]:
    """
    Extract markdown tables from the provided markdown content.
    
    Args:
    markdown_content (str): The full markdown text containing zero or more markdown tables.

    Returns:
    list of str: A list of extracted tables, each formatted as a string including trailing newlines.
    """
    def is_table_line(line: str) -> bool:
        """Check if a line is part of a markdown table."""
        return '|' in line and line.strip().startswith('|') and line.strip().endswith('|')
    
    def finalize_table(current_table: str) -> str:
        """Finalize the current table format by ensuring correct trailing newlines."""
        if current_table and not current_table.endswith('\n\n'):
            return current_table.strip() + '\n\n'
        return current_table

    lines = markdown_content.split('\n')
    tables = []
    current_table = []

    for line in lines:
        if is_table_line(line):
            current_table.append(line)
        else:
            if current_table:
                tables.append(finalize_table('\n'.join(current_table)))
                current_table = []

    if current_table:
        tables.append(finalize_table('\n'.join(current_table)))

    return tables

def enhance_table(table_content: str) -> str:
    """Apply all enabled enhancements to a single table."""
    enhanced_content = table_content
    
    if ENABLE_TABLE_SUMMARY:
        enhanced_content += generate_table_summary(table_content)
    
    if ENABLE_ROW_DESCRIPTIONS:
        enhanced_content = generate_row_descriptions(enhanced_content)
    
    if ENABLE_QA_PAIRS:
        enhanced_content += generate_qa_pairs(enhanced_content)
    
    return enhanced_content

def llm(prompt: str) -> str:
    """Make a call to GPT-4 model."""
    client = get_azure_openai_client()
    return generate_completion(
        client,
        [
            {"role": "system", "content": "You are a helpful assistant skilled in analyzing and describing tabular data."},
            {"role": "user", "content": prompt}
        ],
        os.environ["AZURE_OPENAI_DEPLOYMENT_NAME"]
    )

def generate_table_summary(table_content: str) -> str:
    """Generate a summary of the table content."""
    prompt = f"""
Given the following table:

{table_content}

Please provide a concise summary that captures the key information presented in this table. Your summary should:

1. Identify the main topic or purpose of the table.
2. Highlight the most important data points or trends.
3. Mention any significant patterns or relationships between different columns.
4. Be no longer than 3-4 sentences.

Aim to give a reader a quick understanding of what this table is about and its most crucial insights.
    """
    summary = llm(prompt)
    return f"\n\n<!-- Table Summary: {summary} -->\n"

def generate_row_descriptions(table_content: str) -> str:
    """Generate natural language descriptions for each row."""
    rows = table_content.split('\n')
    header = rows[0]
    separator = rows[1]
    data_rows = rows[2:]
    
    new_rows = [header, separator]
    for row in data_rows:
        new_rows.append(row)
        if row.strip(): 
            prompt = f"""
Given the following table header and a specific row of data:

Header: {header}
Row: {row}

Please provide a concise, natural language description of this row. Your description should:

1. Capture the key information presented in this row.
2. Relate the data to the column headers for context.
3. Highlight any notable or unusual values.
4. Be a single, coherent sentence.

Aim to give a clear and informative summary of what this row represents in the context of the table.
            """
            description = llm(prompt)
            new_rows.append(f"<!-- Row Description: {description} -->")
    
    return '\n'.join(new_rows)

def generate_qa_pairs(table_content: str) -> str:
    """Generate question-answer pairs based on the table content."""
    prompt = f"""
Given the following table:

{table_content}

Please generate 3-5 question-answer pairs based on the information presented in this table. Your Q&A pairs should:

1. Cover key information and insights from the table.
2. Vary in complexity (include both straightforward and more analytical questions).
3. Be answerable solely based on the information in the table.
4. Be clear and concise.

Format your response as follows:

Q1: [Question 1]
A1: [Answer 1]

Q2: [Question 2]
A2: [Answer 2]

... and so on.
    """
    qa_pairs = llm(prompt)
    return f"\n\n<!-- Q&A Pairs:\n{qa_pairs}\n-->\n"