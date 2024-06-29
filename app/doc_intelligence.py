import os
import re
import io
import base64
from typing import List, Tuple
from azure.identity import DefaultAzureCredential
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import ContentFormat
from azure.core.credentials import AzureKeyCredential
from PIL import Image
from .azure_openai import get_azure_openai_client, analyze_image
from .table_postprocessor import enhance_markdown

def refine_figures(content, png_path: str) -> str:
    """Refine figures in the content by adding captions."""
    def process_image(polygon: List[float], pdf_width: float, pdf_height: float, img_width: int, img_height: int) -> str:
        """Process an image and get its caption."""
        with Image.open(png_path) as img:
            width_scale = img_width / pdf_width
            height_scale = img_height / pdf_height
            
            scaled_polygon = [
                coord * width_scale if i % 2 == 0 else coord * height_scale
                for i, coord in enumerate(polygon)
            ]
            
            bbox = [
                min(scaled_polygon[::2]),
                min(scaled_polygon[1::2]),
                max(scaled_polygon[::2]),
                max(scaled_polygon[1::2])
            ]
            
            px_bbox = [int(b) for b in bbox]
            cropped = img.crop(px_bbox)
            return get_caption(cropped)

    def get_caption(img: Image.Image) -> str:
        """Get a caption for the given image using Azure OpenAI."""
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        b64_img = base64.b64encode(buffered.getvalue()).decode()
        
        client = get_azure_openai_client()
        return analyze_image(client, b64_img)

    updated_content = content.content
    pdf_width, pdf_height = content.pages[0].width, content.pages[0].height
    
    with Image.open(png_path) as img:
        img_width, img_height = img.size

    if not content.figures:
        return updated_content

    for i, figure in enumerate(content.figures):
        polygon = figure.bounding_regions[0].polygon
        caption = process_image(polygon, pdf_width, pdf_height, img_width, img_height)
        
        figure_pattern = f"!\\[\\]\\(figures/{i}\\)"
        replacement = f"![{caption}](figures/{i})"
        
        updated_content = re.sub(figure_pattern, replacement, updated_content)
    
    return updated_content

def convert_pdf_page_to_md(pdf_path: str, page_num: int, output_dir: str, prefix: str, refine_markdown: bool = False) -> str:
    """Convert a PDF page to Markdown format."""
    endpoint = os.getenv("DOCUMENTINTELLIGENCE_ENDPOINT")
    document_intelligence_key = os.getenv("DOCUMENTINTELLIGENCE_KEY")
    
    if document_intelligence_key:
        credential = AzureKeyCredential(document_intelligence_key)
    else:
        credential = DefaultAzureCredential()
    
    document_intelligence_client = DocumentIntelligenceClient(endpoint, credential)
    
    with open(pdf_path, "rb") as file:
        poller = document_intelligence_client.begin_analyze_document(
            "prebuilt-layout", 
            analyze_request=file, 
            output_content_format=ContentFormat.MARKDOWN, 
            content_type="application/pdf"
        )
    
    result = poller.result()
    markdown_content = result.content
    
    if refine_markdown:
        png_path = os.path.join(output_dir, f"{prefix}___Page{page_num+1}.png")
        markdown_content = refine_figures(result, png_path)
        markdown_content = enhance_markdown(markdown_content)
    
    
    output_filename = os.path.join(output_dir, f"{prefix}___Page{page_num+1}.md")
    with open(output_filename, "w", encoding='utf-8') as md_file:
        md_file.write(markdown_content)
    
    print(f"Generated MD: {output_filename}")
    return output_filename
