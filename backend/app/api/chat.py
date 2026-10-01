import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.database import SessionLocal
from app.models.chat_message import ChatMessage
from app.models.chat_session import ChatSession
from app.models.user import User
from app.api.dependencies import get_current_user
from app.schemas.chat import (
    ChatMessageResponse,
    ChatRequest,
    ChatResponse,
    ChatSessionDetailResponse,
    ChatSessionResponse,
)
from app.services.llm_service import (
    generate_answer,
    generate_answer_stream,
)
from app.services.rag_service import build_rag_context


router = APIRouter(
    prefix="/api/chat",
    tags=["Chat"],
)


# ---------------------------------------------------------
# Create Chat Session
# ---------------------------------------------------------

def _create_session(
    db,
    first_message: str,
    user_id: int,
) -> ChatSession:

    title = first_message.strip()

    if len(title) > 60:
        title = f"{title[:57]}..."

    session = ChatSession(
        user_id=user_id,
        title=title,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.add(session)
    db.commit()
    db.refresh(session)

    return session


# ---------------------------------------------------------
# Get Conversation History
# ---------------------------------------------------------

def _get_conversation_history(
    db,
    session_id: int,
    limit: int = 10,
) -> str:

    messages = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.session_id == session_id
        )
        .order_by(
            ChatMessage.created_at.desc()
        )
        .limit(limit)
        .all()
    )

    messages.reverse()

    history_parts = []

    for message in messages:

        role = (
            "User"
            if message.role == "user"
            else "Assistant"
        )

        history_parts.append(
            f"{role}: {message.content}"
        )

    return "\n".join(history_parts)


# ---------------------------------------------------------
# Build Sources
# ---------------------------------------------------------

def _build_sources(results):

    sources = []

    for index, result in enumerate(
        results,
        start=1,
    ):

        sources.append(
            {
                "source_number": index,
                "document_id": result["document_id"],
                "chunk_id": result["chunk_id"],
                "title": result["title"],
                "department": result["department"],
                "category": result["category"],
                "version": result["version"],
                "chunk_index": result["chunk_index"],
            }
        )

    return sources


# ---------------------------------------------------------
# Verify Chat Session Ownership
# ---------------------------------------------------------

def _get_user_session(
    db,
    session_id: int,
    user_id: int,
) -> ChatSession:

    session = (
        db.query(ChatSession)
        .filter(
            ChatSession.id == session_id,
            ChatSession.user_id == user_id,
        )
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Chat session not found.",
        )

    return session


# ---------------------------------------------------------
# Standard Chat
# ---------------------------------------------------------

@router.post(
    "",
    response_model=ChatResponse,
)
async def chat(
    request: ChatRequest,
    current_user: User = Depends(
        get_current_user
    ),
):

    db = SessionLocal()

    try:

        # -------------------------------------------------
        # 1. Create a new session or load user's session
        # -------------------------------------------------

        if request.session_id is None:

            session = _create_session(
                db,
                request.message,
                current_user.id,
            )

        else:

            session = _get_user_session(
                db,
                request.session_id,
                current_user.id,
            )

        # -------------------------------------------------
        # 2. Get previous conversation history
        # -------------------------------------------------

        conversation_history = (
            _get_conversation_history(
                db,
                session.id,
            )
        )

        # -------------------------------------------------
        # 3. Save user's message
        # -------------------------------------------------

        user_message = ChatMessage(
            session_id=session.id,
            role="user",
            content=request.message.strip(),
            sources=None,
        )

        db.add(user_message)

        session.updated_at = datetime.utcnow()

        db.commit()

        # -------------------------------------------------
        # 4. Retrieve relevant knowledge-base chunks
        # -------------------------------------------------

        context, results = build_rag_context(
            request.message,
            limit=5,
        )

        # -------------------------------------------------
        # 5. Generate answer
        # -------------------------------------------------

        if not results:

            answer = (
                "I don't have enough information in the "
                "knowledge base to answer that."
            )

        else:

            answer = generate_answer(
                question=request.message,
                context=context,
                conversation_history=conversation_history,
            )

        # -------------------------------------------------
        # 6. Build sources
        # -------------------------------------------------

        sources = _build_sources(
            results
        )

        # -------------------------------------------------
        # 7. Convert sources to JSON
        # -------------------------------------------------

        sources_json = (
            json.dumps(sources)
            if sources
            else None
        )

        # -------------------------------------------------
        # 8. Save assistant response
        # -------------------------------------------------

        assistant_message = ChatMessage(
            session_id=session.id,
            role="assistant",
            content=answer,
            sources=sources_json,
        )

        db.add(assistant_message)

        session.updated_at = datetime.utcnow()

        db.commit()

        # -------------------------------------------------
        # 9. Return response
        # -------------------------------------------------

        return ChatResponse(
            session_id=session.id,
            answer=answer,
            sources=sources,
        )

    except HTTPException:
        db.rollback()
        raise

    except ValueError as error:

        db.rollback()

        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to generate answer: "
                f"{str(error)}"
            ),
        )

    finally:
        db.close()


# ---------------------------------------------------------
# Streaming Chat
# ---------------------------------------------------------

@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    current_user: User = Depends(
        get_current_user
    ),
):

    db = SessionLocal()

    try:

        # -------------------------------------------------
        # 1. Create a new session or load user's session
        # -------------------------------------------------

        if request.session_id is None:

            session = _create_session(
                db,
                request.message,
                current_user.id,
            )

        else:

            session = _get_user_session(
                db,
                request.session_id,
                current_user.id,
            )

        # -------------------------------------------------
        # 2. Get previous conversation history
        # -------------------------------------------------

        conversation_history = (
            _get_conversation_history(
                db,
                session.id,
            )
        )

        # -------------------------------------------------
        # 3. Save user's message
        # -------------------------------------------------

        user_message = ChatMessage(
            session_id=session.id,
            role="user",
            content=request.message.strip(),
            sources=None,
        )

        db.add(user_message)

        session.updated_at = datetime.utcnow()

        db.commit()

        # -------------------------------------------------
        # 4. Retrieve knowledge-base context
        # -------------------------------------------------

        context, results = build_rag_context(
            request.message,
            limit=5,
        )

        # -------------------------------------------------
        # 5. Build sources
        # -------------------------------------------------

        sources = _build_sources(
            results
        )

        session_id = session.id

        def generate_stream():

            assistant_parts = []

            try:

                # -----------------------------------------
                # Send session ID
                # -----------------------------------------

                yield (
                    "event: session\n"
                    f"data: {json.dumps({'session_id': session_id})}\n\n"
                )

                # -----------------------------------------
                # No knowledge-base results
                # -----------------------------------------

                if not results:

                    answer = (
                        "I don't have enough information in the "
                        "knowledge base to answer that."
                    )

                    assistant_parts.append(
                        answer
                    )

                    yield (
                        "event: message\n"
                        f"data: {json.dumps({'content': answer})}\n\n"
                    )

                # -----------------------------------------
                # Generate streaming answer
                # -----------------------------------------

                else:

                    for chunk in generate_answer_stream(
                        question=request.message,
                        context=context,
                        conversation_history=conversation_history,
                    ):

                        assistant_parts.append(
                            chunk
                        )

                        yield (
                            "event: message\n"
                            f"data: {json.dumps({'content': chunk})}\n\n"
                        )

                # -----------------------------------------
                # Reconstruct complete answer
                # -----------------------------------------

                answer = "".join(
                    assistant_parts
                ).strip()

                if not answer:

                    raise ValueError(
                        "Ollama returned an empty response."
                    )

                # -----------------------------------------
                # Persist sources
                # -----------------------------------------

                sources_json = (
                    json.dumps(sources)
                    if sources
                    else None
                )

                # -----------------------------------------
                # Save assistant response
                # -----------------------------------------

                assistant_message = ChatMessage(
                    session_id=session_id,
                    role="assistant",
                    content=answer,
                    sources=sources_json,
                )

                db.add(
                    assistant_message
                )

                session.updated_at = (
                    datetime.utcnow()
                )

                db.commit()

                # -----------------------------------------
                # Send sources
                # -----------------------------------------

                yield (
                    "event: sources\n"
                    f"data: {json.dumps({'sources': sources})}\n\n"
                )

                # -----------------------------------------
                # Streaming complete
                # -----------------------------------------

                yield (
                    "event: done\n"
                    f"data: {json.dumps({'session_id': session_id})}\n\n"
                )

            except Exception as error:

                db.rollback()

                yield (
                    "event: error\n"
                    f"data: {json.dumps({'message': str(error)})}\n\n"
                )

            finally:

                db.close()

        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    except HTTPException:

        db.rollback()
        db.close()

        raise

    except Exception as error:

        db.rollback()
        db.close()

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to start streaming response: "
                f"{str(error)}"
            ),
        )


# ---------------------------------------------------------
# Get User's Chat Sessions
# ---------------------------------------------------------

@router.get(
    "/sessions",
    response_model=list[ChatSessionResponse],
)
async def get_chat_sessions(
    current_user: User = Depends(
        get_current_user
    ),
):

    db = SessionLocal()

    try:

        sessions = (
            db.query(ChatSession)
            .filter(
                ChatSession.user_id
                == current_user.id
            )
            .order_by(
                ChatSession.updated_at.desc()
            )
            .all()
        )

        return sessions

    finally:

        db.close()


# ---------------------------------------------------------
# Delete User's Chat History
# ---------------------------------------------------------

@router.delete(
    "/sessions",
)
async def delete_all_chat_sessions(
    current_user: User = Depends(
        get_current_user
    ),
):

    db = SessionLocal()

    try:

        sessions = (
            db.query(ChatSession)
            .filter(
                ChatSession.user_id
                == current_user.id
            )
            .all()
        )

        session_ids = [
            session.id
            for session in sessions
        ]

        if session_ids:

            (
                db.query(ChatMessage)
                .filter(
                    ChatMessage.session_id.in_(
                        session_ids
                    )
                )
                .delete(
                    synchronize_session=False
                )
            )

            (
                db.query(ChatSession)
                .filter(
                    ChatSession.user_id
                    == current_user.id
                )
                .delete(
                    synchronize_session=False
                )
            )

        db.commit()

        return {
            "message": (
                "Your conversation history "
                "was deleted successfully."
            )
        }

    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to delete conversation history: "
                f"{str(error)}"
            ),
        )

    finally:

        db.close()


# ---------------------------------------------------------
# Get Specific User Chat Session
# ---------------------------------------------------------

@router.get(
    "/sessions/{session_id}",
    response_model=ChatSessionDetailResponse,
)
async def get_chat_session(
    session_id: int,
    current_user: User = Depends(
        get_current_user
    ),
):

    db = SessionLocal()

    try:

        session = _get_user_session(
            db,
            session_id,
            current_user.id,
        )

        messages = (
            db.query(ChatMessage)
            .filter(
                ChatMessage.session_id
                == session_id
            )
            .order_by(
                ChatMessage.created_at.asc()
            )
            .all()
        )

        message_responses = []

        for message in messages:

            sources = None

            if message.sources:

                try:

                    sources = json.loads(
                        message.sources
                    )

                except json.JSONDecodeError:

                    sources = None

            message_responses.append(
                {
                    "id": message.id,
                    "session_id": message.session_id,
                    "role": message.role,
                    "content": message.content,
                    "sources": sources,
                    "created_at": message.created_at,
                }
            )

        return {
            "session": session,
            "messages": message_responses,
        }

    finally:

        db.close()