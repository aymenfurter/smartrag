# smartRAG - AI-Powered Research Assistant

This application is an AI-powered research assistant that leverages Azure OpenAI and Cognitive Search to analyze documents and answer complex questions across multiple data sources.

## Features

- Upload and index PDF documents through ingestion jobs.
- Chat interface for querying indexed documents.
- Multi-agent research system for in-depth analysis.
- Document preview and citation support.

## Quick Start

1. Clone the repository:
   ```
   git clone https://github.com/aymenfurter/smartrag.git
   cd smartrag
   ```

2. Create a `.env` file in the root directory with the following variables:
   ```
   DOCUMENTINTELLIGENCE_KEY=your_value
   STORAGE_ACCOUNT_NAME=your_value
   DOCUMENTINTELLIGENCE_ENDPOINT=your_value
   RESOURCE_GROUP=your_value
   SUBSCRIPTION_ID=your_value
   SEARCH_SERVICE_ENDPOINT=your_value
   SEARCH_SERVICE_API_KEY=your_value
   AOAI_API_KEY=your_value
   OPENAI_ENDPOINT=your_value
   ADA_DEPLOYMENT_NAME=your_value
   AZURE_OPENAI_DEPLOYMENT_ID=your_value
   STORAGE_ACCOUNT_KEY=your_value
   ```

3. Build the Docker image:
   ```
   docker build -t ai-research-assistant .
   ```

4. Run the Docker container:
   ```
   docker run --env-file .env -p 5000:5000 ai-research-assistant
   ```

The application should now be running and accessible at `http://localhost:5000`.

## Environment Variables

Ensure all environment variables in the `.env` file are properly set before running the container. These variables are crucial for connecting to various Azure services and configuring the application.

For more detailed information about each variable and its purpose, please refer to the application documentation.