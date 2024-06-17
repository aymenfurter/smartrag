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
