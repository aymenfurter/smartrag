import os
import logging
from PyPDF2 import PdfReader, PdfWriter

def get_user_id(request):
    return request.headers.get('X-MS-CLIENT-PRINCIPAL-NAME', "163e5568-589b-12d3-5454-426614174063")

def easyauth_enabled(request):
    return not get_user_id(request).startswith("163e5568-589b-12d3-5454-426614174063")