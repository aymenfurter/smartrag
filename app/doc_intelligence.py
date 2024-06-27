import os
from azure.identity import DefaultAzureCredential
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import ContentFormat
from azure.core.credentials import AzureKeyCredential
from PIL import Image
import base64
import io
from .azure_openai import get_azure_openai_client, analyze_image
import re

def refine_figures(content, png_path):
    def process_image(polygon):
        img = Image.open(png_path)
        dpi = img.info.get('dpi', (300, 300))
        bbox = [min(polygon[::2]), min(polygon[1::2]), max(polygon[::2]), max(polygon[1::2])]
        px_bbox = [int(b * d) for b, d in zip(bbox, dpi * 2)]
        cropped = img.crop(px_bbox)
        return get_caption(cropped)

    def get_caption(img):
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        b64_img = base64.b64encode(buffered.getvalue()).decode()
        
        client = get_azure_openai_client()
        return analyze_image(client, b64_img)

    updated_content = content.content

    for i, figure in enumerate(content.figures):
        polygon = figure.bounding_regions[0].polygon
        caption = process_image(polygon)
        
        figure_pattern = f"!\\[\\]\\(figures/{i}\\)"
        replacement = f"![{caption}](figures/{i})"
        updated_content = re.sub(figure_pattern, replacement, updated_content)

    return updated_content

def convert_pdf_page_to_md(pdf_path, page_num, output_dir, prefix, refine_images=False):
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
    markdown_content = result.content

    if refine_images:
        png_path = os.path.join(output_dir, f"{prefix}___Page{page_num+1}.png")
        markdown_content = refine_figures(result, png_path)

    output_filename = os.path.join(output_dir, f"{prefix}___Page{page_num+1}.md")
    with open(output_filename, "w") as md_file:
        md_file.write(markdown_content)

    print(f"Generated MD: {output_filename}")
    print(f"Content: {markdown_content}")
    return output_filename