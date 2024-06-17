# Use the official Python image from the Docker Hub
FROM python:3.10-slim

# Set environment variables
ENV PYTHONUNBUFFERED 1

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt /app/

# Install the dependencies
RUN pip install --upgrade pip
RUN apt-get update && apt-get install -y poppler-utils
RUN pip install -r requirements.txt

# Copy the rest of the application code into the container
COPY . /app/

# Run the Flask application
CMD ["python", "main.py"]