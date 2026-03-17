# Kinward — Document Drop Spec

**Status:** Draft  
**Last updated:** March 16, 2026

---

## Overview

Users can share files with Lumina in chat. Lumina reads the document, answers questions about it, and (in later phases) extracts key facts into core memory.

Design principle: **start with truncate-and-be-honest (Option A), but build the chunking foundation so keyword-driven retrieval (Option C) is a data migration, not a rewrite.**

---

## 1. Supported File Types

### MVP (Phase 1)
- **PDF** — text extraction via `pdf-parse` (npm). Most common format for receipts, invoices, contracts, forms.
- **Plain text** — `.txt`, `.md`. Direct read, no parsing needed.
- **Images** — `.jpg`, `.jpeg`, `.png`. OCR via vision model (GLM-OCR or Llama 3.2-Vision). Phase 1.5 — can ship slightly after text support.

### Future
- **Word docs** — `.docx` via `mammoth` or `docx-parser`
- **Spreadsheets** — `.csv`, `.xlsx` — extract as markdown table
- **HTML** — strip tags, extract text

---

## 2. Architecture

### 2a. Upload Flow

```
User drags file into chat (or clicks 📎)
  → Frontend reads file, sends to POST /api/chat/upload
  → Backend determines file type
  → Backend extracts text content
  → Backend chunks text into ~1500-token segments
  → Backend stores chunks in `document_chunks` table
  → Backend returns: { documentId, filename, totalChunks, previewText, totalTokens }
  → Frontend shows file attachment card in chat
  → User types question
  → POST /api/chat/message includes documentId
  → Backend injects relevant chunks into system prompt
  → Lumina answers based on document content
```

### 2b. New Database Table

```sql
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id TEXT REFERENCES sessions(id),
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  total_chunks INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS document_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_estimate INTEGER DEFAULT 0,
  UNIQUE(document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_doc_chunks_doc
  ON document_chunks(document_id);
```

### 2c. Why Chunk on Upload (Even for MVP)

MVP only injects the first N chunks. But by storing chunks from the start:
- Upgrading to keyword-driven retrieval (Option C) is just a query change, not a pipeline change
- Document memory extraction can process chunks individually
- Large documents don't need re-processing if the user asks another question later
- Export/backup includes document knowledge

---

## 3. Prompt Injection Strategy

### Token Budget

Total available context: ~128K (Llama 3.1 8B)  
Practical sweet spot: ~8K total prompt to keep inference fast

| Component | Token Budget |
|---|---|
| AI personality (core prompt) | ~600 |
| Core memory context | ~200-800 (varies) |
| World context | ~200 |
| Guardrails | ~100 |
| **Document content** | **~3000-5000** |
| Conversation history | ~1000-2000 |
| User message | ~100-500 |

### MVP Injection (Option A)

```
// Inject first N chunks that fit within budget
const DOC_TOKEN_BUDGET = 4000;
let injected = "";
let tokensUsed = 0;

for (const chunk of chunks) {
  if (tokensUsed + chunk.token_estimate > DOC_TOKEN_BUDGET) break;
  injected += chunk.content + "\n\n";
  tokensUsed += chunk.token_estimate;
}

// System message:
{
  role: "system",
  content: `The user has shared a document: "${filename}"
Here is the content (${chunksInjected} of ${totalChunks} sections):

${injected}

${totalChunks > chunksInjected
  ? `Note: This document is longer than what's shown above. You've seen the first ${chunksInjected} sections. If the user asks about something not covered here, let them know you've only read part of the document and offer to continue reading.`
  : "You have the complete document."}

Answer the user's questions based on this document content. Cite specific details when possible.`
}
```

### Future: Keyword-Driven Retrieval (Option C)

When ready to upgrade:
1. User asks a question
2. Extract keywords from question
3. Score each chunk by keyword overlap
4. Inject top-scoring chunks (within budget) instead of sequential first-N
5. No vector DB needed — just string matching against stored chunks

This is a query-layer change. The storage layer (documents + document_chunks tables) stays the same.

---

## 4. Token Estimation

Simple heuristic (no tokenizer dependency):
```js
function estimateTokens(text) {
  // ~4 characters per token for English text (conservative)
  return Math.ceil(text.length / 4);
}
```

Not exact, but good enough for budget management. Overestimating is safer than underestimating.

---

## 5. Chunking Strategy

```js
function chunkText(text, targetTokens = 1500) {
  const targetChars = targetTokens * 4; // ~4 chars per token
  const chunks = [];
  
  // Prefer splitting on paragraph breaks
  const paragraphs = text.split(/\n\s*\n/);
  let current = "";
  
  for (const para of paragraphs) {
    if (current.length + para.length > targetChars && current.length > 0) {
      chunks.push(current.trim());
      current = para;
    } else {
      current += (current ? "\n\n" : "") + para;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  
  return chunks;
}
```

Split on paragraph boundaries to keep semantic units intact. A receipt or invoice naturally has sections (header, line items, totals) that map well to paragraphs.

---

## 6. Frontend UX

### File Attachment Button
- 📎 icon button next to the chat input (left side of send button)
- Click opens native file picker
- Drag-and-drop onto the chat area also works
- Accept: `.pdf`, `.txt`, `.md`, `.jpg`, `.jpeg`, `.png`
- Max file size: 10MB (reasonable for documents and photos)

### Attachment Card
After upload, show a card above the input:
```
┌─────────────────────────────┐
│ 📄 invoice-march.pdf        │
│ 3 pages · 2,400 tokens      │
│                         [✕] │
└─────────────────────────────┘
```
- Shows filename, size info
- X to remove before sending
- Card persists in the message thread after sending

### In Chat
When Lumina is reading a partial document:
> "I've read the first 4 sections of your document. Based on what I see, [answer]. If you need me to look at a specific section further in, let me know."

---

## 7. API Endpoints

### POST /api/chat/upload
```
Request: multipart/form-data
  - file: the uploaded file
  - profileId: who uploaded it
  - sessionId: which chat session

Response: {
  documentId: "uuid",
  filename: "invoice.pdf",
  fileType: "pdf",
  totalChunks: 4,
  totalTokens: 2400,
  previewText: "First 200 chars of document..."
}
```

### GET /api/chat/documents/:sessionId
Returns all documents attached to a session.

---

## 8. Build Order

### Step 1: Backend — Upload + Extract + Chunk + Store
- Add tables to db.js schema
- Create upload endpoint with multer
- PDF extraction with pdf-parse
- Plain text extraction (direct read)
- Chunking function
- Store in document_chunks

### Step 2: Backend — Injection into Chat
- Modify chat.js message handler
- If message includes documentId, load chunks
- Inject within token budget
- Add honest truncation messaging

### Step 3: Frontend — Upload UI
- 📎 button in chat input area
- File picker + drag-and-drop
- Upload to backend
- Attachment card display
- Pass documentId with messages

### Step 4: Image OCR (Phase 1.5)
- Pull GLM-OCR or Llama 3.2-Vision via Ollama
- Route image uploads through vision model
- OCR output feeds into same chunk/store pipeline

### Step 5: Document Memory (Phase 2)
- After document is processed, run extraction prompt against chunks
- Store key facts in core_memory with source = "document:{filename}"
- Lumina remembers document facts across sessions

---

## 9. Constraints & Guardrails

- **File size cap:** 10MB per upload
- **Storage:** Documents stored on local filesystem in `data/uploads/`
- **Privacy:** Documents never leave the device. Same local-only principle as chat.
- **Per-session:** Documents are attached to sessions. A new chat session starts fresh.
- **Child profiles:** Document upload should be available to all roles (kids upload homework, parents upload invoices)
- **No internet:** All processing is local. No cloud OCR, no external APIs.

---

## 10. Open Questions

- Should documents persist across sessions? Or just within the session they were uploaded to?
- Should Lumina proactively summarize a document on upload? Or wait for questions?
- For very long documents (50+ pages), should we offer a "quick summary" mode that summarizes each chunk and stores the summaries?
- Should the document chunks table support full-text search (SQLite FTS5) from the start?

---

*This spec is the reference for the document drop feature. Build against it, update it as we learn.*
