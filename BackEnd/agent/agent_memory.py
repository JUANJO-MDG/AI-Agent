from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from pydantic import SecretStr
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory, InMemoryChatMessageHistory
from dotenv import load_dotenv
# Librerias para el agente de busqueda
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_tavily import TavilySearch

import os

load_dotenv()

API_KEY = os.getenv("GROQ_API_KEY")
if API_KEY is None:
    raise ValueError("GROQ_API_KEY environment variable is not set.")

TAVILY_KEY = os.getenv('TAVILY_API_KEY')
if TAVILY_KEY is None:
    raise ValueError("TAVILY_API_KEY environment variable is not set.")

# Herramienta de búsqueda web usando Tavily
tavily_search_tool = TavilySearch(api_key=TAVILY_KEY)
tools = [tavily_search_tool]

prompt = ChatPromptTemplate.from_messages([
    ("system", """Eres un asistente de IA experto en razonamiento y uso de herramientas para responder.

    **Sigue estos pasos rigurosamente:**
    1.  **Entiende la solicitud.**
    2.  **Decide si necesitas herramientas:**
        * **Si la pregunta es sobre información actual, eventos, noticias o datos dinámicos, USA 'TavilySearch'.**
        * **Para usar TavilySearch, llama la herramienta con el formato EXACTO:** `TavilySearch(query='TU CONSULTA A LA HERRAMIENTA AQUÍ')`. Ejemplo: `TavilySearch(query='últimas noticias de tecnología')`.
        * Si puedes responder con tu conocimiento interno, NO uses herramientas.
    3.  **Genera una respuesta concisa y precisa**, usando tu conocimiento y/o los resultados de la búsqueda.
    4.  **Si no tienes información clara, infórmalo.**

    **Tu respuesta final debe ser solo la respuesta al usuario, sin comentarios internos.** Mantén un tono profesional y utiliza tu memoria de conversación.

    **Para código:** usa bloques Markdown (```lenguaje```). Ejemplo:
    ```python
    print("Hola")
    ```
    Asegúrate de incluir el lenguaje después de los tres backticks para un resaltado de sintaxis correcto."""),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad")
])

llm = ChatGroq(
    api_key=SecretStr(API_KEY),
    model="meta-llama/llama-4-scout-17b-16e-instruct",
    max_tokens=1024,
    temperature=0.3
)

agent = create_tool_calling_agent(llm, tools, prompt)

agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=True,
    handle_parsing_errors=True
)


store = {}

def get_chat_history(session_id: str) -> BaseChatMessageHistory:
    if session_id not in store:
        store[session_id] = InMemoryChatMessageHistory()
    return store[session_id]

chat_runnable = RunnableWithMessageHistory(
    agent_executor,
    get_session_history=get_chat_history,
    input_messages_key="input",
    history_messages_key="history"
)


def get_response(message: str, session_id: str) -> str:
    try:
        response = chat_runnable.invoke(
            {"input": message},
            config={"configurable": {"session_id": session_id}}
        )
        return response['output']
    except Exception as e:
        print(f"Error en get_response del agente: {e}")
        return "Lo siento, hubo un problema al procesar tu solicitud con las herramientas disponibles. Por favor, intenta de nuevo."