import os
from io import BytesIO
import logging
from pdf2image import convert_from_path
from PyPDF2 import PdfReader

def convert_pdf_page_to_png(pdf_path, page_num, output_dir, prefix):
    logging.debug(f"Converting PDF page {page_num + 1} to PNG: {pdf_path}")
    if not os.path.exists(pdf_path):
        raise ValueError(f"The file {pdf_path} does not exist.")
    
    images = convert_from_path(pdf_path, first_page=1, last_page=1)
    if images:
        output_filename = os.path.join(output_dir, f"{prefix}___Page{page_num+1}.png")
        for image in images:
            image.save(output_filename, "PNG")
        logging.debug(f"Generated PNG: {output_filename}")
        return output_filename
    else:
        raise ValueError(f"No images were generated for page {page_num + 1} of {pdf_path}")

def get_pdf_page_count(pdf_bytes: BytesIO) -> int:
    try:
        reader = PdfReader(pdf_bytes)
        return len(reader.pages)
    except Exception as e:
        logging.error(f"Error getting PDF page count: {str(e)}")
        raise