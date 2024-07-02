from typing import Dict, Any, List, Tuple, Optional
from functools import lru_cache
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.docstore.document import Document
from langchain.prompts import PromptTemplate
from langchain_openai import AzureChatOpenAI
from langchain.chains import LLMChain
from .index_manager import create_index_manager, ContainerNameTooLongError, IndexManager
from .azure_openai import get_openai_config

class AskService:
    def __init__(self, blob_service):
        self.blob_service = blob_service
        self.llm = self._initialize_llm()
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=120000,
            chunk_overlap=200,
            length_function=len,
        )

    @staticmethod
    @lru_cache(maxsize=1)
    def _initialize_llm() -> AzureChatOpenAI:
        config = get_openai_config()
        return AzureChatOpenAI(
            azure_endpoint=config["OPENAI_ENDPOINT"],
            api_version="2024-02-15-preview",
            deployment_name=config["AZURE_OPENAI_DEPLOYMENT_ID"],
            api_key=config["AOAI_API_KEY"],
        )

    def ask_question(self, data: Dict[str, Any], user_id: str) -> Tuple[Dict[str, Any], int]:
        try:
            self._validate_input(data)
            index_manager = self._get_index_manager(user_id, data['indexName'], data['isRestricted'])
            document_content = self._get_document_content(index_manager, data['fileName'])
            answers = self._process_questions(document_content, data['questions'])
            return {"answers": answers}, 200
        except ValueError as e:
            print(e)
            return {"error": str(e)}, 400
        except Exception as e:
            print(e)
            return {"error": "An unexpected error occurred"}, 500

    @staticmethod
    def _validate_input(data: Dict[str, Any]) -> None:
        required_fields = ['indexName', 'questions', 'fileName']
        if not all(field in data for field in required_fields):
            raise ValueError("Missing required parameters")

    def _get_index_manager(self, user_id: str, index_name: str, is_restricted: bool) -> IndexManager:
        try:
            index_manager = create_index_manager(user_id, index_name, is_restricted)
            if not index_manager.user_has_access():
                raise ValueError("Unauthorized access")
            return index_manager
        except ContainerNameTooLongError as e:
            raise ValueError(str(e))

    def _get_document_content(self, index_manager: IndexManager, filename: str) -> str:
        try:
            return self._collect_document_content(index_manager, filename)
        except Exception as e:
            raise ValueError(f"Error collecting document content: {str(e)}")

    def _process_questions(self, document_content: str, questions: List[str]) -> List[Dict[str, str]]:
        chunks = self.text_splitter.split_text(document_content)
        
        questions_text = "\n".join(f"- {q}" for q in questions)
        summary = self._generate_summary(chunks, questions_text)
        
        return [self._process_single_question(summary, question) for question in questions]

    def _generate_summary(self, chunks: List[str], questions: str) -> str:
        summary_chain = LLMChain(llm=self.llm, prompt=self._get_custom_summary_prompt())
        
        summary = ""
        for chunk in chunks:
            chunk_summary = summary_chain.run(questions=questions, document_content=chunk)
            summary += chunk_summary + "\n\n"
        
        final_summary = summary_chain.run(questions=questions, document_content=summary)
        return final_summary

    def _process_single_question(self, summary: str, question: str) -> Dict[str, str]:
        prompt = self._get_qa_prompt().format(context=summary, question=question)
        response = self.llm.invoke(prompt)
        return {"question": question, "answer": response.content}

    @staticmethod
    @lru_cache(maxsize=1)
    def _get_custom_summary_prompt() -> PromptTemplate:
        template = """
        You are tasked with summarizing the following document content while focusing on answering these specific questions:

        Questions:
        {questions}

        Document content:
        {document_content}

        Please provide a concise summary that specifically addresses the given questions. If the document doesn't contain relevant information for a question, state that the information is not available.

        Summary:
        """
        return PromptTemplate(template=template, input_variables=["questions", "document_content"])

    @staticmethod
    @lru_cache(maxsize=1)
    def _get_qa_prompt() -> PromptTemplate:
        template = """
        Use the following summary to answer the question at the end. 
        If you don't know the answer, just say that you don't know, don't try to make up an answer.

        Summary: {context}

        Question: {question}

        Answer:"""
        return PromptTemplate(template=template, input_variables=["context", "question"])

    def _collect_document_content(self, index_manager: IndexManager, filename: str) -> str:
        container_name = index_manager.get_ingestion_container()
        files = self._list_container_files(container_name)
        relevant_files = self._filter_relevant_files(files, filename)
        return self._combine_file_contents(container_name, relevant_files)

    def _list_container_files(self, container_name: str) -> List[str]:
        try:
            container_client = self.blob_service.get_container_client(container_name)
            return [blob.name for blob in container_client.list_blobs()]
        except Exception as e:
            raise ValueError(f"Error listing files: {str(e)}")

    @staticmethod
    def _filter_relevant_files(files: List[str], filename: str) -> List[str]:
        relevant_files = [f for f in files if f.startswith(filename) and f.endswith('.md')]
        relevant_files.sort(key=lambda x: int(x.split('___Page')[1].split('.')[0]))
        if not relevant_files:
            raise ValueError(f"No markdown files found for {filename}")
        return relevant_files

    def _combine_file_contents(self, container_name: str, files: List[str]) -> str:
        container_client = self.blob_service.get_container_client(container_name)
        full_content = ""
        for i, file in enumerate(files, 1):
            blob_client = container_client.get_blob_client(file)
            content = blob_client.download_blob().readall().decode('utf-8')
            full_content += f"--- Page {i} ---\n{content}\n\n"
        return full_content