# AI Document Assistant

## Live Demo

**[Launch AI Document Assistant](https://ai-document-assistant-kacv.onrender.com)**

> The application is hosted on Render's free hosting tier.
> The initial request may take longer while the server wakes up.

## Overview

A full-stack AI-powered document assistant that allows users to
upload, read, search, and interact with documents through natural
language using large language models and the Model Context
Protocol (MCP).

Built with React, Node.js, Express, Python, PostgreSQL, Claude,
and Ollama.

## Features

- Upload PDF, TXT, and Markdown documents.
- View and read document contents.
- Search across accessible documents.
- Ask natural language questions about documents.
- Maintain multi-turn AI conversations.
- Generate context-aware responses using document content.
- Access three built-in sample documents.
- Support multiple AI providers.
- Run AI locally using Ollama and Qwen3.
- Integrate with the Anthropic Claude API.
- Isolate uploaded documents between visitor sessions.
- Automatically clean up expired documents.
- Enforce API usage limits and AI spending controls.
- Responsive user interface for desktop and mobile devices.

## Sample Documents

The application includes three publicly accessible sample
documents so visitors can explore its functionality without
uploading their own files.

- Company Handbook (PDF)
- Product Inventory (TXT)
- Software Documentation (Markdown)

## Technologies Used

### Frontend

- React
- JavaScript (ES6+)
- HTML5
- CSS3
- Vite
- ESLint

### Backend

- Node.js
- Express.js
- REST APIs
- Multer
- Helmet
- CORS
- Express Rate Limit

### Python and MCP

- Python
- FastMCP
- Model Context Protocol (MCP)
- PyPDF
- Regular Expressions
- Pathlib

### Artificial Intelligence

- Anthropic Claude API
- Claude Haiku 5.5
- Ollama
- Qwen3
- Prompt Engineering
- Context Management
- Multi-turn Conversations
- Document-grounded AI Responses
- Token Counting
- AI Usage and Cost Tracking

### Database

- PostgreSQL
- Neon
- Node-postgres (pg)
- SQL Transactions
- PostgreSQL Advisory Locks

### Deployment and Development

- Docker
- Render
- Git
- GitHub
- npm Workspaces
- Python Virtual Environments

## Application Architecture

```text
                 React Frontend
                       |
                       | REST API
                       |
                Express Backend
                       |
          +------------+------------+
          |            |            |
       Python      PostgreSQL    AI Provider
     MCP Server       Neon        Service
          |                         |
     Document               +-------+-------+
     Processing             |               |
                          Claude          Ollama
                           API            Qwen3
```

The React frontend communicates with an Express REST API.

The backend connects to a Python MCP server to process and
retrieve document content. Document content and conversation
history are provided to the selected AI model to generate
context-aware responses.

PostgreSQL manages document ownership, storage reservations,
AI usage records, request limits, and spending controls.

The AI provider service supports both cloud-based Claude
integration and local inference through Ollama.

## Project Structure

```text
ai-document-assistant/
├── client/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── db/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── index.js
│   └── package.json
│
├── mcp-server/
│   ├── documents/
│   ├── sample-documents/
│   ├── main.py
│   └── requirements.txt
│
├── Dockerfile
├── .dockerignore
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

## Security and Privacy

The application implements multiple layers of security
to protect uploaded documents, server resources, and
AI API credentials.

- Server-side API key management.
- Environment variable validation.
- HTTP security headers using Helmet.
- Restricted CORS configuration.
- API endpoint rate limiting.
- File extension and content validation.
- UUID-based uploaded filenames.
- Path traversal protection.
- HTTP-only session cookies.
- Secure cookies in production.
- Session-based document ownership verification.
- Hashed visitor identification.
- Parameterized SQL queries.
- Restricted MCP document access.
- Automatic document expiration and cleanup.
- Database-backed storage reservations.
- Prompt instructions designed to reduce document-based
  prompt injection risks.

Uploaded documents are isolated by visitor session and are
configured to expire after 24 hours.

## AI Usage and Cost Protection

The application includes database-backed usage tracking
and spending controls to help prevent excessive API usage
and unexpected costs.

| Resource | Configured Limit |
|----------|------------------|
| AI requests per visitor | 5 per day |
| Total AI requests | 100 per day |
| Maximum input tokens | 4,000 per request |
| Maximum output tokens | 500 per request |
| Monthly AI budget | $4.00 USD |
| Maximum upload size | 10 MB |
| Maximum documents per session | 5 |
| Storage per session | 50 MB |
| Global document storage | 200 MB |
| Document retention | 24 hours |
| Maximum PDF pages | 100 |

AI spending controls include:

- Input token counting before generation.
- Maximum output token enforcement.
- Estimated cost reservations before API requests.
- Database-backed daily request limits.
- Monthly spending checks.
- Actual token usage and cost reconciliation.
- Conservative tracking of uncertain API requests.
- PostgreSQL transactions and advisory locks to prevent
  concurrent requests from bypassing reservation limits.
- Disabled automatic API retries.

These controls are designed to reduce financial risk.
Actual provider charges remain subject to provider pricing
and billing policies.

## Getting Started

### Prerequisites

Make sure the following are installed:

- Node.js 22 or later
- npm
- Python 3.11 or later
- Git
- PostgreSQL or a Neon PostgreSQL database
- Ollama for local AI inference

An Anthropic API key is only required when using Claude.

### 1. Clone the Repository

```bash
git clone https://github.com/Joshua-2333/ai-document-assistant.git
cd ai-document-assistant
```

### 2. Install JavaScript Dependencies

From the root directory:

```bash
npm ci
```

The project uses npm workspaces to manage frontend
and backend dependencies.

### 3. Set Up the Python MCP Server

```bash
cd mcp-server

python3 -m venv .venv

source .venv/bin/activate

pip install -r requirements.txt

mkdir -p documents

deactivate

cd ..
```

The backend automatically starts the MCP server when
document-processing operations are required.

### 4. Install and Configure Ollama

Download Ollama from:

https://ollama.com/

Download the Qwen3 model:

```bash
ollama pull qwen3
```

Start Ollama if it is not already running:

```bash
ollama serve
```

Verify that the model is installed:

```bash
ollama list
```

Ollama allows the application to generate AI responses
locally without paid API access.

### 5. Configure Environment Variables

Create a `.env` file inside the `server` directory.

```env
NODE_ENV=development
PORT=3000

CLIENT_ORIGIN=http://localhost:5173

AI_PROVIDER=ollama

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-haiku-5-5

AI_MAX_INPUT_TOKENS=4000
AI_MAX_OUTPUT_TOKENS=500
AI_MAX_REQUESTS_PER_VISITOR=5
AI_MAX_REQUESTS_PER_DAY=100
AI_MONTHLY_BUDGET_USD=4.00

DATABASE_URL=your_postgresql_connection_string

VISITOR_HASH_SECRET=your_generated_secret
```

Generate a visitor hashing secret using Node.js:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copy the generated value into `VISITOR_HASH_SECRET`.

Replace `DATABASE_URL` with a valid PostgreSQL connection
string.

For a hosted Neon database, configure certificate
verification using `sslmode=verify-full`.

Never commit your `.env` file, database credentials,
API keys, or visitor hashing secrets to GitHub.

### 6. Initialize the Database

```bash
cd server

npm run db:init
```

This initializes the database tables required for:

- AI usage tracking.
- AI cost reservations.
- Document ownership.
- Document storage management.
- Document expiration and cleanup.

### 7. Start the Backend

From the `server` directory:

```bash
npm run dev
```

The backend runs at:

```text
http://localhost:3000
```

### 8. Start the Frontend

Open a separate terminal and navigate to the client directory:

```bash
cd ai-document-assistant/client

npm run dev
```

Open the application in your browser:

```text
http://localhost:5173
```

## AI Provider Configuration

The application supports interchangeable AI providers.

### Ollama

For free local AI inference:

```env
AI_PROVIDER=ollama
```

Ollama uses the locally installed Qwen3 model and does
not require an external API key.

### Anthropic Claude

For cloud-based AI inference:

```env
AI_PROVIDER=anthropic
ANTHROPIC_MODEL=claude-haiku-5-5
ANTHROPIC_API_KEY=your_anthropic_api_key
```

An active Anthropic API account and available API credits
are required.

Claude requests are subject to the application's
database-backed usage limits and spending controls.

Verify current model pricing against the application's
pricing configuration before enabling paid AI requests.

### Disabled Mode

To disable AI generation while keeping document
management functionality available:

```env
AI_PROVIDER=disabled
```

This configuration allows users to upload, read, and
search documents without generating paid AI requests.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Check backend health |
| GET | `/api/documents` | Retrieve accessible documents |
| GET | `/api/documents/:filename` | Read a document |
| GET | `/api/documents/search?query=example` | Search documents |
| POST | `/api/documents/upload` | Upload a document |
| POST | `/api/documents/ask` | Ask an AI question |

## MCP Tools

The Python MCP server exposes two document-processing tools.

### read_document

Reads and extracts text from a specified document.

Supported formats:

- PDF
- TXT
- Markdown

### search_documents

Searches explicitly authorized documents for a query
and returns matching text snippets.

Document access is restricted to public sample documents
and documents authorized by the backend.

## Production Deployment

The application is containerized using Docker and deployed
as a single web service on Render.

The Docker image:

1. Installs Node.js and Python dependencies.
2. Creates a Python virtual environment.
3. Installs the MCP server requirements.
4. Builds the React frontend.
5. Removes unnecessary development dependencies.
6. Creates the document storage directory.
7. Runs the application as a non-root user.
8. Starts the Express production server.

Express serves both the REST API and the compiled React
frontend from the same origin.

Neon provides the hosted PostgreSQL database.

Production deployments require the appropriate environment
variables, including the public client origin and a trusted
proxy configuration matching the hosting infrastructure.

### Hosting Infrastructure

| Component | Technology |
|-----------|------------|
| Frontend | React and Vite |
| Backend | Node.js and Express |
| Document Processing | Python and FastMCP |
| Database | Neon PostgreSQL |
| Containerization | Docker |
| Web Hosting | Render |
| Cloud AI Integration | Anthropic Claude |
| Local AI | Ollama and Qwen3 |

## Demo Limitations

- The application uses Render's free hosting tier.
- Initial requests may be delayed while the server wakes up.
- Uploaded documents are stored on an ephemeral filesystem
  and may be lost when the hosting instance restarts.
- Uploaded documents are configured to expire after 24 hours.
- AI availability depends on provider configuration,
  available API credits, and usage limits.
- AI generation is currently disabled in the public demo
  pending final production configuration and verification.
- Scanned PDFs that require OCR are not currently supported.
- Large documents or long conversations may exceed the
  configured AI input token limit.
- AI-generated responses may contain inaccuracies and
  should be verified against the original document.

This project is intended as a portfolio demonstration.
Do not upload confidential or sensitive documents.

## Skills Demonstrated

This project demonstrates practical experience with:

- Full-stack web application development.
- REST API design and implementation.
- React frontend development.
- JavaScript and Python integration.
- Large language model API integration.
- Model Context Protocol implementation.
- Local AI model integration.
- Prompt engineering and context management.
- Document processing and text extraction.
- Multi-provider AI architecture.
- PostgreSQL database design.
- SQL transactions and concurrency control.
- API security and resource management.
- AI token usage and cost management.
- Session-based document isolation.
- Docker containerization.
- Cloud deployment.
- Environment variable and secret management.

## Author

**Joshua Flores**

Full Stack Web Developer

- GitHub: [Joshua-2333](https://github.com/Joshua-2333)
- Portfolio: [Development Projects](https://github.com/stars/Joshua-2333/lists/portfolio)
- Live Demo: [AI Document Assistant](https://ai-document-assistant-kacv.onrender.com)
