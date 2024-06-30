import os
import logging
from PyPDF2 import PdfReader, PdfWriter

def split_pdf_to_pages(pdf_path, output_dir, prefix):
    pdf = PdfReader(open(pdf_path, "rb"))
    num_pages = len(pdf.pages)
    for i in range(num_pages):
        pdf_writer = PdfWriter()
        pdf_writer.add_page(pdf.pages[i])
        output_filename = os.path.join(output_dir, f"{prefix}___Page{i+1}.pdf")
        with open(output_filename, "wb") as output_pdf:
            pdf_writer.write(output_pdf)
    logging.debug(f"Split PDF into {num_pages} pages for user {prefix}.")
    return num_pages

def get_user_id(request):
    return request.headers.get('X-MS-CLIENT-PRINCIPAL-NAME', "163e5568-589b-12d3-5454-426614174063")

def easyauth_enabled(request):
    return not get_user_id(request).startswith("163e5568-589b-12d3-5454-426614174063")