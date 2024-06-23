import os
from azure.identity import DefaultAzureCredential
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import ContentFormat
from azure.core.credentials import AzureKeyCredential

def convert_pdf_page_to_md(pdf_path, page_num, output_dir, prefix):
    endpoint = os.getenv("DOCUMENTINTELLIGENCE_ENDPOINT")

    credential = DefaultAzureCredential()
    document_intelligence_key = os.getenv("DOCUMENTINTELLIGENCE_KEY")

    if document_intelligence_key:
        credential = AzureKeyCredential(document_intelligence_key)

    document_intelligence_client = DocumentIntelligenceClient(endpoint, credential)

    with open(pdf_path, "rb") as file:
        poller = document_intelligence_client.begin_analyze_document(
            "prebuilt-layout", analyze_request=file, output_content_format=ContentFormat.MARKDOWN, content_type="application/pdf"
        )

    result = poller.result()

    output_filename = os.path.join(output_dir, f"{prefix}___Page{page_num+1}.md")
    with open(output_filename, "w") as md_file:
        md_file.write(result.content)

    print(f"Generated MD: {output_filename}")
    return output_filename
