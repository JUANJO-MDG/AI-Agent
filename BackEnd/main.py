# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from agent.agent_memory import get_response
import re

app = FastAPI(
    title='AI Assistant',
    description='Assistant with memory and website search capabilities'
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,      
    allow_methods=["*"],        
    allow_headers=["*"],          
)

class ChatInput(BaseModel):
    message: str
    session_id: Optional[str] = "default"

def clean_ai_response(response_text: str) -> str:
    response_text = response_text.replace("```json", "").replace("```python", "").replace("```", "")
    
    lines = response_text.split('\n')
    
    cleaned_lines = []
    in_code_block = False


    code_pattern = re.compile(r'^\s*(def|class|import|for|while|if|return|print|with|try|except|@|\[|\{|[a-zA-Z_]\w*\s*=|:).*$')
    
    indent_pattern = re.compile(r'^\s+')

    current_indent_level = -1 
    
    for i, line in enumerate(lines):
        stripped_line = line.strip()

        if not stripped_line:
            if in_code_block:
                cleaned_lines.append(line) 
            else:
                cleaned_lines.append(line)
            continue


        match_indent = indent_pattern.match(line)
        line_indent_level = len(match_indent.group(0)) if match_indent else 0

        if in_code_block:
            
            is_code_line = bool(code_pattern.match(line)) or stripped_line.startswith('#') or stripped_line.startswith('"""') or stripped_line.startswith("'''")

            if not is_code_line and line_indent_level <= current_indent_level / 2: 
                cleaned_lines.append("```") 
                in_code_block = False
                current_indent_level = -1
                cleaned_lines.append(line) 
            elif in_code_block and line_indent_level < current_indent_level and not is_code_line:
                cleaned_lines.append("```")
                in_code_block = False
                current_indent_level = -1
                cleaned_lines.append(line)
            else:
                cleaned_lines.append(line) 
                if line_indent_level > current_indent_level:
                    current_indent_level = line_indent_level
        else:
            is_likely_code_start = bool(code_pattern.match(line)) or (line_indent_level > 0 and stripped_line)
            
            if is_likely_code_start and not stripped_line.lower().startswith(("claro", "hola", "ejemplo de uso", "este código", "desafortunadamente", "no puedo", "te gustaría", "este es un ejemplo", "el siguiente es un ejemplo", "espero que")):
                cleaned_lines.append("```python") 
                cleaned_lines.append(line)
                in_code_block = True
                current_indent_level = line_indent_level 
            else:
                cleaned_lines.append(line)

    if in_code_block:
        cleaned_lines.append("```")

    return "\n".join(cleaned_lines).strip()


@app.post("/chat", tags=["Conversación"])
def chat(input: ChatInput):
    session_id = input.session_id if input.session_id is not None else "default"
    print(f"Backend recibió mensaje para session_id: '{session_id}'")

    try:
        ai_response_raw = get_response(input.message, session_id)
        cleaned_response = clean_ai_response(ai_response_raw)
        
        return {"response": cleaned_response}
    except Exception as e:
        print(f"Error procesando el chat: {e}")
        return {"response": "Lo siento, algo salió mal. Por favor, intenta de nuevo más tarde."}
