import json
import requests


OLLAMA_URL = "http://localhost:11434"
LLM_MODEL = "llama3.2:3b"


SYSTEM_PROMPT = """
You are an Enterprise AI Knowledge Assistant.

Your job is to answer the user's question using only the
information explicitly provided in the retrieved company
knowledge-base context.

Rules:

1. Use the Knowledge Base Context as the only source of
   company facts.

2. If the answer is explicitly present in the Knowledge Base
   Context, answer it directly and confidently.

3. Carefully read all relevant parts of the retrieved context.
   If a policy contains a relationship, mapping, list, or
   multiple required parties, preserve the complete relationship
   in your answer.

4. Do not omit relevant parts of an answer.
   For example, if the context says:
   "International -> Department Head + Finance"
   the answer must include both "Department Head" and "Finance".

5. Do not invent company policies, rules, dates, numbers,
   procedures, approvals, names, or other facts.

6. If the Knowledge Base Context does not contain enough
   information to answer the question, say exactly:
   "I don't have enough information in the knowledge base
   to answer that."

7. Conversation history is provided only to understand
   references and follow-up questions such as:
   "it", "them", "that", "what about", or similar references.

8. Never use conversation history as a source of company facts.
   Company facts must come from the Knowledge Base Context.

9. Do not create or mention source numbers such as
   "SOURCE 1", "SOURCE 2", "SOURCE 3", etc.
   Do not create citations, chunk numbers, or source references.
   Source information is handled separately by the application.

10. Answer the user's current question directly.
    Do not describe your reasoning or retrieval process.

11. Be concise and natural.

12. Mention the document name only when it is useful to the user.
"""


def _build_prompt(
    question: str,
    context: str,
    conversation_history: str = "",
) -> str:
    history_section = ""

    if conversation_history and conversation_history.strip():
        history_section = f"""
Previous Conversation:

{conversation_history}
"""

    return f"""
Knowledge Base Context:

{context}

{history_section}

Current User Question:

{question}

Answer the current user's question using only the
Knowledge Base Context.

First determine whether the answer is explicitly present
in the context. If it is, give the answer directly.

When the answer contains multiple required people,
departments, conditions, amounts, dates, or other parts,
include all relevant parts that are explicitly stated
in the context.

If the context does not contain enough information,
use the required knowledge-base fallback response.

Use Previous Conversation only to understand references
such as "it", "them", "that", "what about", or similar
follow-up wording. Do not use Previous Conversation as
a source of company facts.

Do not mention SOURCE numbers, chunk numbers, retrieval
details, or internal source references in your answer.
"""


def generate_answer(
    question: str,
    context: str,
    conversation_history: str = "",
) -> str:
    """
    Generate a complete answer using Ollama.
    """

    if not question or not question.strip():
        raise ValueError(
            "Question cannot be empty."
        )

    if not context or not context.strip():
        return (
            "I don't have enough information in the "
            "knowledge base to answer that."
        )

    prompt = _build_prompt(
        question=question,
        context=context,
        conversation_history=conversation_history,
    )

    response = requests.post(
        f"{OLLAMA_URL}/api/generate",
        json={
            "model": LLM_MODEL,
            "system": SYSTEM_PROMPT,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.1,
            },
        },
        timeout=120,
    )

    response.raise_for_status()

    data = response.json()

    answer = data.get("response")

    if not answer:
        raise ValueError(
            "Ollama returned an empty response."
        )

    return answer.strip()


def generate_answer_stream(
    question: str,
    context: str,
    conversation_history: str = "",
):
    """
    Generate an answer from Ollama incrementally.

    Yields response text chunks as they are generated.
    """

    if not question or not question.strip():
        raise ValueError(
            "Question cannot be empty."
        )

    if not context or not context.strip():
        yield (
            "I don't have enough information in the "
            "knowledge base to answer that."
        )
        return

    prompt = _build_prompt(
        question=question,
        context=context,
        conversation_history=conversation_history,
    )

    response = requests.post(
        f"{OLLAMA_URL}/api/generate",
        json={
            "model": LLM_MODEL,
            "system": SYSTEM_PROMPT,
            "prompt": prompt,
            "stream": True,
            "options": {
                "temperature": 0.1,
            },
        },
        stream=True,
        timeout=120,
    )

    response.raise_for_status()

    for line in response.iter_lines():
        if not line:
            continue

        data = json.loads(line)

        chunk = data.get("response", "")

        if chunk:
            yield chunk

        if data.get("done"):
            break