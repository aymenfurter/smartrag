import os
import json
import autogen
from flask import jsonify, Response, stream_with_context
from .blob_service import sanitize_container_name
from .azure_openai import create_payload, create_data_source, get_openai_config
from typing import Annotated
import requests

def create_agent(name, system_message, llm_config):
    return autogen.AssistantAgent(
        name=name,
        llm_config=llm_config,
        system_message=system_message,
    )

def create_reviewer_agent(llm_config, single_data_source=False):
    if single_data_source:
        system_message = """
I am Reviewer. I review the research and drive conclusions. Once I am done, I will ask you to terminate the conversation.

My job is to ask questions and guide the research to find the information I need and combine it into a final conclusion.

I will make sure to ask follow-up questions to get the full picture.

Only once I have all the information I need, I will ask you to terminate the conversation. 

To terminate the conversation, I will write ONLY the string: TERMINATE
"""
    else:
        system_message = """
I am Reviewer. I review the research of the group and drive conclusions. Once I am done, I will ask you to terminate the conversation.

I am working with a team of researchers. Each researcher is an expert on a specific data source. They will be able to give me only part of the information I need.

My job is to ask questions and guide the researchers to find the information I need and combine it into a final conclusion.

I will make sure to take information from each researcher and ask follow-up questions to get the full picture.

Only once I have all the information I need, I will ask you to terminate the conversation. 

To terminate the conversation, I will write ONLY the string: TERMINATE
"""

    return autogen.AssistantAgent(
        name="Reviewer",
        llm_config=llm_config,
        is_termination_msg=lambda msg: "TERMINATE" in msg["content"].upper(),
        system_message=system_message,
    )

def create_user_proxy():
    return autogen.UserProxyAgent(
        name="Admin",
        human_input_mode="NEVER",
        code_execution_config=False,
    )

def search(query, index):
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
    
    if "choices" not in response.json():
        raise Exception("FATAL ERROR: No response from OpenAI API. TERMINATE.")

    content = response.json()["choices"][0]["message"]["content"]
    citations = response.json()["choices"][0]["message"].get("context", {}).get("citations", [])

    if citations:
        formatted_citations = "\n\nCitations:\n"
        for citation in citations:
            formatted_citations += f"- [{citation['title']}]({citation['url']})\n"
        content += formatted_citations

    return content

def generate_final_conclusion(chat_result):
    config = get_openai_config()
    url = f"{config['OPENAI_ENDPOINT']}/openai/deployments/{config['AZURE_OPENAI_DEPLOYMENT_ID']}/chat/completions?api-version=2024-02-15-preview"
    headers = {
        "Content-Type": "application/json",
        "api-key": config['AOAI_API_KEY']
    }
    system_prompt = """
    Based on the following chat history, provide a detailed final conclusion covering:

    Key Insights
    Final Conclusion
    Relevant Citations and Sources (Please always reference URLs to the sources used in the research!)

    Do not report on the process that was used, just conclude. Do not come up with new information, just summarize the chat history.
    """

    chat_history = [{"role": message['role'], "content": message.get('content', '')} for message in chat_result.chat_history]

    user_prompt = f"""
    Chat History:
    {json.dumps(chat_history)}
    """

    payload = create_payload(
        [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
        {},
        {},
        [],
        False
    )

    response = requests.post(url, headers=headers, json=payload)
    
    return response.json()["choices"][0]["message"]["content"]

def research_with_data(data, user_id):
    config = get_openai_config()
    question = data.get("question")
    max_rounds = data.get("maxRounds", 20)
    data_sources = data.get("dataSources", [])

    config_list = [{"model": config['AZURE_OPENAI_DEPLOYMENT_ID'], "api_key": config['AOAI_API_KEY'], "base_url": config['OPENAI_ENDPOINT'] + "/", "api_type": "azure", "api_version": "2024-02-15-preview"}]
    llm_config = {
        "temperature": 0,
        "config_list": config_list,
    }

    user_proxy = create_user_proxy()
    researchers = []

    for source in data_sources:
        print(source)
        print("Adding source")
        print(source['name'])
        is_restricted = source.get("isRestricted", True)
        prefix = f"{user_id}-" if is_restricted else "open-"
        search_index = sanitize_container_name(f"{prefix}{source['index']}-ingestion")
        index_name = source.get("name", "")
        if not index_name or index_name == "":
            index_name = source.get("index", "")

        researcher = create_agent(
            f"{index_name}Researcher",
            f"""I am  a Researcher. I am an expert for {index_name}. I will investigate and research any questions regarding this specific data source. I will always use the search feature to find the information I need.  

            I may get information from other researches but I must always use the search feature to find the information I need, specifically to my expertise and data source.

            My data source is: {index_name}

            {source['description']}

            Through the search feature, I am querying a semantic search engine so it's good to have long, detailed & descriptive sentences. I can try out to rephrase your questions to get more information.

            I will make sure to detail your search queries as much as possible.""",
            llm_config
        )
        researchers.append(researcher)

        def create_lookup_function(index):
            def lookup_information(question: Annotated[str, "Use this function to search for information on the data source: " + index_name]) -> str:
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

    reviewer = create_reviewer_agent(llm_config, single_data_source=(len(data_sources) == 1))

    print("Researchers: ", researchers)

    groupchat = autogen.GroupChat(
        agents=[user_proxy, reviewer] + researchers,
        messages=[],
        max_round=max_rounds,
        speaker_selection_method="round_robin",
    )
    manager = autogen.GroupChatManager(groupchat=groupchat, llm_config=llm_config)

    def stream_research():
        chat_result = user_proxy.initiate_chat(
            manager,
            message=question,
            max_rounds=max_rounds
        )

        print("Chat result", chat_result)
        
        for message in chat_result.chat_history:
            yield json.dumps(message) + "\n"
        
        final_conclusion = generate_final_conclusion(chat_result)
        yield json.dumps({"final_conclusion": final_conclusion}) + "\n"

    return Response(stream_with_context(stream_research()), content_type='application/x-ndjson')