import json
from typing import List, Dict, Any, Callable, Annotated
from flask import jsonify, Response, stream_with_context
from autogen import AssistantAgent, UserProxyAgent, GroupChat, GroupChatManager
from .azure_openai import create_payload, create_data_source, get_openai_config
from .index_manager import create_index_manager, ContainerNameTooLongError
import time
import requests

def create_agent(name: str, system_message: str, llm_config: Dict[str, Any]) -> AssistantAgent:
    """Create an AssistantAgent with the given parameters."""
    return AssistantAgent(
        name=name,
        llm_config=llm_config,
        system_message=system_message,
    )

def create_reviewer_agent(llm_config: Dict[str, Any], list_of_researchers: str, single_data_source: bool = False) -> AssistantAgent:
    """Create a reviewer agent based on the number of data sources."""
    system_message = (
        "I am Reviewer. I review the research and drive conclusions. "
        "Once I am done, I will ask you to terminate the conversation.\n\n"
        "My job is to ask questions and guide the research to find the information I need "
        "and combine it into a final conclusion.\n\n"
        "I will make sure to ask follow-up questions to get the full picture.\n\n"
        "Only once I have all the information I need, I will ask you to terminate the conversation.\n\n"
        "Keep an eye on the referenced documents, if it looks like not the right documents were referenced, ask the researcher to reframe the question to find additional data sources.\n\n"
        "Try follow-up questions in case you the answer looks incomplete.\n\n"
        "Your researcher is: " + list_of_researchers + "\n\n"
        "To terminate the conversation, I will write ONLY the string: TERMINATE"
    )

    return AssistantAgent(
        name="Reviewer",
        llm_config=llm_config,
        is_termination_msg=lambda msg: "TERMINATE" in msg["content"].upper(),
        system_message=system_message,
    )

def create_user_proxy() -> UserProxyAgent:
    """Create a UserProxyAgent."""
    return UserProxyAgent(
        name="Admin",
        human_input_mode="NEVER",
        code_execution_config=False,
    )

def search(query: str, index: str) -> str:
    """Perform a search query on the given index."""

    config = get_openai_config()
    url = f"{config['OPENAI_ENDPOINT']}/openai/deployments/{config['AZURE_OPENAI_DEPLOYMENT_ID']}/chat/completions?api-version=2024-02-15-preview"
    headers = {
        "Content-Type": "application/json",
        "api-key": config['AOAI_API_KEY']
    }
    payload = create_payload(
        [{"role": "user", "content": query}],
        {},
        {},
        [create_data_source(config['SEARCH_SERVICE_ENDPOINT'], config['SEARCH_SERVICE_API_KEY'], index)],
        False
    )
    response = requests.post(url, headers=headers, json=payload)

    if response.status_code == 429:
        retry_after = int(response.headers.get("Retry-After", 5))
        time.sleep(retry_after*2)
        response = requests.post(url, headers=headers, json=payload)
    
    if "choices" not in response.json():
        if response.status_code == 429:
            raise Exception("ERROR: Rate limit exceeded. Try again later.")
        raise Exception("FATAL ERROR: No response from OpenAI API. TERMINATE.")


    content = response.json()["choices"][0]["message"]["content"]
    citations = response.json()["choices"][0]["message"].get("context", {}).get("citations", [])

    if citations:
        formatted_citations = "\n\nCitations:\n"
        formatted_citations += "\n".join([f"- [{citation['title']}]({citation['url']})" for citation in citations])
        content += formatted_citations

    return content

def generate_final_conclusion(chat_result: Any) -> str:
    """Generate a final conclusion based on the chat history."""
    config = get_openai_config()
    url = f"{config['OPENAI_ENDPOINT']}/openai/deployments/{config['AZURE_OPENAI_DEPLOYMENT_ID']}/chat/completions?api-version=2024-02-15-preview"
    headers = {
        "Content-Type": "application/json",
        "api-key": config['AOAI_API_KEY']
    }
    system_prompt = (
        "Based on the following chat history, provide a detailed final conclusion covering:\n\n"
        "- Key Insights\n"
        "- Final Conclusion\n"
        "- Relevant Citations and Sources (Please ALWAYS reference original URLs to the sources used in the research!)\n\n"
        "Important:\n- DONT CHANGE ANY URL! Use original URLs (INCLUDING THE ___Pagexxx at the end!) like these: https://xxx.blob.core.windows.net/open-baloise-ingestion/myfile.pdf___Page101.md\n"
        "- Do not report on the process that was used, just conclude. \n"
        "- Do not come up with new information, just summarize the chat history. \n"
    )

    chat_history = [{"role": message['role'], "content": message.get('content', '')} for message in chat_result.chat_history]

    user_prompt = f"Chat History:\n{json.dumps(chat_history)}"

    payload = create_payload(
        [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
        {},
        {},
        [],
        False
    )

    response = requests.post(url, headers=headers, json=payload)

    if response.status_code == 429:
        retry_after = int(response.headers.get("Retry-After", 5))
        time.sleep(retry_after*3)
        response = requests.post(url, headers=headers, json=payload)
    
    return response.json()["choices"][0]["message"]["content"]

def research_with_data(data: Dict[str, Any], user_id: str) -> Response:
    """Perform research based on the provided data and user ID."""
    config = get_openai_config()
    question = data.get("question")
    max_rounds = data.get("maxRounds", 20)
    data_sources = data.get("dataSources", [])

    config_list = [{
        "model": config['AZURE_OPENAI_DEPLOYMENT_ID'],
        "api_key": config['AOAI_API_KEY'],
        "base_url": config['OPENAI_ENDPOINT'] + "/",
        "api_type": "azure",
        "api_version": "2024-02-15-preview"
    }]
    llm_config = {
        "temperature": 0,
        "config_list": config_list,
    }

    user_proxy = create_user_proxy()
    researchers = []

    researcher_agents_list = ", ".join([source.get("name", "") or source.get("index", "") for source in data_sources])

    researcher = create_agent(
        f"Researcher",
        f"""I am a Researcher. I am an expert for these data sources: {researcher_agents_list}. I will investigate and research any questions regarding this specific data source. I will always use the search feature to find the information I need.  

        I may get information from other researchers but I must always use the search feature to find the information I need, specifically to my expertise and data source.

        Through the search feature, I am querying a semantic search engine so it's good to have long, detailed & descriptive sentences. I can try out to rephrase your questions to get more information.

        I do not use any common knowledge, I always use the search feature to find the information I need.

        I will make sure to detail your search queries as much as possible.""",
        llm_config
    )

    for source in data_sources:
        is_restricted = source.get("isRestricted", True)
        
        try:
            index_manager = create_index_manager(user_id, source['index'], is_restricted)
        except ContainerNameTooLongError as e:
            return jsonify({"error": str(e)}), 400

        if not index_manager.user_has_access():
            return jsonify({"error": f"Unauthorized access to index: {source['index']}"}), 403

        search_index = index_manager.get_search_index_name()
        index_name = source.get("name", "") or source.get("index", "")


        def create_lookup_function(index: str) -> Callable[[Annotated[str, f"Use this function to search for information on the data source: {index_name}"]], str]:
            def lookup_information(question: Annotated[str, f"Use this function to search for information on the data source: {index_name}"]) -> str:
                return search(question, index)
            return lookup_information

        lookup_function = create_lookup_function(search_index)
        
        researcher.register_for_llm(
            name=f"lookup_{index_name}",
            description=f"Search for information in {index_name}"
        )(lookup_function)

        user_proxy.register_for_execution(
            name=f"lookup_{index_name}"
        )(lookup_function)
        


    reviewer = create_reviewer_agent(llm_config, single_data_source=(len(data_sources) == 1), list_of_researchers=researcher_agents_list)

    groupchat = GroupChat(
        agents=[user_proxy, reviewer, researcher],
        messages=[],
        max_round=max_rounds,
        speaker_selection_method="round_robin",
    )
    manager = GroupChatManager(groupchat=groupchat, llm_config=llm_config)

    def stream_research():
        chat_result = user_proxy.initiate_chat(
            manager,
            message=question,
            max_rounds=max_rounds
        )

        for message in chat_result.chat_history:
            yield json.dumps(message) + "\n"
        
        final_conclusion = generate_final_conclusion(chat_result)
        yield json.dumps({"final_conclusion": final_conclusion}) + "\n"

    return Response(stream_with_context(stream_research()), content_type='application/x-ndjson')