# Enterprise AI Knowledge Assistant

An enterprise AI knowledge assistant POC that allows users to ask questions about company documents using Retrieval-Augmented Generation (RAG).

The application provides:

* Secure user authentication
* Role-based administration
* Knowledge-base document upload and management
* Document parsing and chunking
* Vector embeddings
* Qdrant vector search
* Retrieval-Augmented Generation
* Local LLM inference with Ollama
* Streaming chatbot responses
* Conversation history
* Admin dashboard
* Document re-indexing and deletion
* User and administrator management

---

## 1. Architecture

The application consists of four main runtime components:

```text
┌───────────────────────────────┐
│       React Frontend          │
│       Vite + React             │
│       http://localhost:5173   │
└───────────────┬───────────────┘
                │ HTTP / JWT
                ▼
┌───────────────────────────────┐
│       FastAPI Backend         │
│       http://127.0.0.1:8000  │
└───────┬───────────┬───────────┘
        │           │
        │           ├──────────────────┐
        │           │                  │
        ▼           ▼                  ▼
   SQLite       Qdrant             Ollama
   Database     Vector DB           Local LLM
                :6333               :11434
```

### RAG flow

```text
Company Document
      │
      ▼
Document Parser
      │
      ▼
Text Chunking
      │
      ▼
Embedding Generation
(nomic-embed-text)
      │
      ▼
Qdrant Vector Database
      │
      │
User Question
      │
      ▼
Question Embedding
      │
      ▼
Vector Retrieval
      │
      ▼
Relevant Knowledge Context
      │
      ▼
Ollama LLM
(llama3.2:3b)
      │
      ▼
Grounded Answer
```

The LLM is instructed to use the retrieved knowledge-base context as the source of company facts and to return a fallback response when the available knowledge does not contain enough information.

---

## 2. Technology Stack

### Frontend

* React
* Vite
* React Router
* Axios
* Tailwind CSS
* Lucide React

### Backend

* Python
* FastAPI
* SQLAlchemy
* SQLite
* JWT authentication
* Pydantic

### AI / RAG

* Ollama
* `llama3.2:3b` for generation
* `nomic-embed-text` for embeddings
* Qdrant for vector storage and retrieval

### Supported documents

* PDF
* DOCX
* TXT
* Markdown

---

## 3. Project Structure

```text
enterprise-ai-assistant/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py
│   │   │   ├── chat.py
│   │   │   ├── dashboard.py
│   │   │   ├── dependencies.py
│   │   │   ├── documents.py
│   │   │   └── users.py
│   │   │
│   │   ├── models/
│   │   │   ├── chat_message.py
│   │   │   ├── chat_session.py
│   │   │   ├── document.py
│   │   │   ├── document_chunk.py
│   │   │   └── user.py
│   │   │
│   │   ├── schemas/
│   │   │   └── chat.py
│   │   │
│   │   ├── services/
│   │   │   ├── answer_service.py
│   │   │   ├── auth_service.py
│   │   │   ├── document_chunker.py
│   │   │   ├── document_parser.py
│   │   │   ├── embedding_service.py
│   │   │   ├── indexing_service.py
│   │   │   ├── llm_service.py
│   │   │   ├── qdrant_service.py
│   │   │   ├── rag_service.py
│   │   │   └── retrieval_service.py
│   │   │
│   │   ├── database.py
│   │   └── main.py
│   │
│   └── venv/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── layouts/
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   └── user/
│   │   ├── services/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   └── package.json
│
├── data/
├── docs/
├── documents/
├── tests/
├── .env
├── .gitignore
└── README.md
```

Runtime-generated files and sensitive configuration are excluded from source control through `.gitignore`.

---

## 4. Prerequisites

Install the following before running the application:

* Python
* Node.js
* npm
* Docker Desktop
* Ollama

The project currently uses:

* Node.js 24.x
* npm 11.x
* Ollama
* Qdrant running through Docker

---

## 5. Ollama Setup

Verify that Ollama is installed:

```powershell
ollama --version
```

Verify the installed models:

```powershell
ollama list
```

The application requires:

```text
llama3.2:3b
nomic-embed-text
```

If they are not installed:

```powershell
ollama pull llama3.2:3b
ollama pull nomic-embed-text
```

Start Ollama if it is not already running:

```powershell
ollama serve
```

Ollama is expected at:

```text
http://localhost:11434
```

---

## 6. Qdrant Setup

The POC uses Qdrant as its vector database.

Start Docker Desktop first.

Check the container:

```powershell
docker ps -a
```

Start the existing Qdrant container:

```powershell
docker start enterprise-ai-qdrant
```

Qdrant is expected at:

```text
http://localhost:6333
```

The application uses the collection:

```text
enterprise_documents
```

The collection uses:

* Vector size: 768
* Distance: Cosine

---

## 7. Backend Setup

Open PowerShell:

```powershell
cd D:\chatbots\enterprise-ai-assistant\backend
```

Activate the Python virtual environment:

```powershell
.\venv\Scripts\Activate.ps1
```

Start FastAPI:

```powershell
uvicorn app.main:app --reload
```

The backend will be available at:

```text
http://127.0.0.1:8000
```

Health check:

```text
http://127.0.0.1:8000/health
```

Swagger API documentation:

```text
http://127.0.0.1:8000/docs
```

---

## 8. Frontend Setup

Open another PowerShell window:

```powershell
cd D:\chatbots\enterprise-ai-assistant\frontend
```

Install dependencies if required:

```powershell
npm install
```

Start the development server:

```powershell
npm run dev
```

The frontend will be available at:

```text
http://localhost:5173
```

---

## 9. Environment Configuration

The backend uses a `.env` file for authentication configuration.

Example structure:

```env
JWT_SECRET_KEY=<your-secret-key>
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
```

Never commit the real `.env` file to source control.

A deployment or shared development environment should provide its own secret configuration.

---

## 10. Authentication and Roles

The application supports three roles.

### Super Administrator

Role:

```text
super_admin
```

Capabilities:

* Full administration access
* Manage users
* Manage co-administrators
* Manage documents
* Upload documents
* Re-index documents
* Delete documents
* Access dashboard
* Cannot be deleted or deactivated

There is exactly one Super Administrator in the POC.

### Co-Administrator

Role:

```text
admin
```

Capabilities:

* Manage normal users
* Activate/deactivate normal users
* Edit normal users
* Delete normal users
* Access document administration
* Upload and manage knowledge-base documents
* Access dashboard

Restrictions:

* Cannot modify the Super Administrator
* Cannot delete or deactivate the Super Administrator
* Cannot create another co-administrator
* Cannot promote a normal user to administrator

### Normal User

Role:

```text
user
```

Capabilities:

* Sign in
* Use the AI assistant
* Ask knowledge-base questions
* View conversation history

Normal users cannot access the administration portal.

---

## 11. Document Processing

Administrators can upload supported documents through the administration portal.

The document processing pipeline is:

```text
Upload
  ↓
File Validation
  ↓
Document Parsing
  ↓
Text Extraction
  ↓
Chunking
  ↓
Embedding Generation
  ↓
Qdrant Indexing
  ↓
Indexed
```

The current chunking configuration uses:

```text
Chunk size: 1000
Chunk overlap: 150
```

Embeddings are generated using:

```text
nomic-embed-text
```

Documents can subsequently be re-indexed or deleted from the administration portal.

---

## 12. RAG Question Answering

When a user asks a question:

```text
User Question
     ↓
Question Embedding
     ↓
Qdrant Similarity Search
     ↓
Relevant Knowledge Chunks
     ↓
RAG Context
     ↓
Ollama
     ↓
Streaming Answer
```

The current retrieval configuration uses:

```text
Top results: 5
Similarity threshold: 0.75
```

The assistant is instructed to:

* Use the knowledge base as the source of company facts
* Preserve complete relationships from retrieved policies
* Avoid inventing company information
* Avoid using conversation history as a source of company facts
* Answer directly
* Remain concise
* Return a knowledge-base fallback when sufficient information is unavailable

Fallback response:

```text
I don't have enough information in the knowledge base to answer that.
```

---

## 13. Chat History

The application stores:

* Chat sessions
* User messages
* Assistant messages
* Retrieved source information associated with responses

Conversation history can be accessed through the user interface.

Conversation history is used to understand follow-up references such as:

```text
it
them
that
what about
```

It is not treated as the authoritative source for company facts.

---

## 14. Administration Portal

Administrators have access to:

### Dashboard

Displays:

* Total documents
* Indexed documents
* Processing documents
* Failed documents
* Knowledge-base chunk count
* Conversation statistics
* Recent document activity
* Knowledge-base health

### Documents

Administrators can:

* Search documents
* Filter documents
* View document metadata
* Re-index documents
* Delete documents
* Refresh document information

### Upload Document

Administrators can upload supported documents and provide metadata such as:

* Title
* Department
* Category
* Version
* Description

### Users

The user management area provides role-aware user administration.

---

## 15. API Authentication

Protected API requests use JWT Bearer authentication.

Example:

```text
Authorization: Bearer <access-token>
```

The frontend automatically attaches the token to Axios API requests.

If the backend returns HTTP 401, the frontend clears the stored authentication information and redirects the user to the login page.

---

## 16. Important Runtime URLs

| Component      | URL                          |
| -------------- | ---------------------------- |
| Frontend       | http://localhost:5173        |
| Backend        | http://127.0.0.1:8000        |
| Backend health | http://127.0.0.1:8000/health |
| Swagger        | http://127.0.0.1:8000/docs   |
| Ollama         | http://localhost:11434       |
| Qdrant         | http://localhost:6333        |

---

## 17. Starting the Complete POC

Start the services in this order.

### 1. Docker / Qdrant

```powershell
docker start enterprise-ai-qdrant
```

### 2. Ollama

Make sure Ollama is running and the required models are available:

```powershell
ollama list
```

### 3. Backend

```powershell
cd D:\chatbots\enterprise-ai-assistant\backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

### 4. Frontend

Open a second PowerShell window:

```powershell
cd D:\chatbots\enterprise-ai-assistant\frontend
npm run dev
```

Open:

```text
http://localhost:5173
```

---

## 18. Production Frontend Build

To create the production frontend build:

```powershell
cd D:\chatbots\enterprise-ai-assistant\frontend
npm run build
```

A successful build generates the `frontend/dist` directory.

The production build directory is excluded from source control.

---

## 19. Validation Checklist

The POC has been tested across the following areas:

### Authentication

* Login
* Logout
* Authentication restoration
* Invalid token handling
* Protected routes

### Normal User

* User login
* Chat access
* Chat history
* Restricted administration access

### Super Administrator

* Full administration access
* User management
* Document management
* Dashboard access

### Documents

* Upload
* Parsing
* Chunking
* Embedding
* Qdrant indexing
* Re-indexing
* Delete

### RAG Chat

* Knowledge retrieval
* Context-based answers
* Streaming responses
* Knowledge-base fallback
* Conversation follow-up handling

### Permissions

* Super Administrator restrictions
* Co-administrator restrictions
* Normal user restrictions

### Production Build

Frontend production build has been successfully completed using:

```powershell
npm run build
```

---

## 20. Source Control

The following should remain local and must not be committed:

* `.env`
* Python virtual environments
* `node_modules`
* frontend build output
* Python cache files
* SQLite databases
* uploaded knowledge-base documents
* runtime data
* logs
* temporary files

These are covered by the project's `.gitignore`.

---

## 21. POC Scope

This project is currently a local enterprise AI knowledge-assistant POC.

The current implementation is intended to demonstrate:

* Enterprise authentication
* Role-based administration
* Document knowledge management
* RAG-based question answering
* Local LLM inference
* Vector search
* Streaming AI responses
* Conversation history
* Administrative monitoring

Production deployment would require environment-specific infrastructure, operational monitoring, secret management, deployment configuration, backup strategy, and additional production hardening.