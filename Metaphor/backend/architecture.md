# Metaphor Architecture

## 1. Product Context
Metaphor is the context operating system of the Pseudonyms ecosystem. It serves as a personal AI memory and a unified workspace for managing identity, goals, projects, history, and knowledge.

## 2. Canonical Models
The graph architecture is cleanly separated from the operational architecture.

### Graph Models (`app/models/graph.py`)
- **Node**: The primary entity (e.g., Project, Decision, Goal). Contains metadata, content, and state (`status`, `confidence`, `decided_at`).
- **Edge**: Represents directed relationships between nodes (e.g., `owns`, `alternative`, `requires`).
- **Evidence**: Raw contextual data (e.g., a Notion page excerpt, a Git commit) linked to a Node. This replaces the legacy `Chunk` model.
- **Embedding**: Stores the vector embeddings (e.g., 3072 dimensions) for semantic search. Associated with a Node.
- **NodeMetadata**: Dynamic key-value pairs associated with a node.

### Operational Models (`app/models/operations.py`)
- **Integration**: Represents third-party connections (GitHub, Notion).
- **UniversalEvent**: A standardized event log from an external system.
- **MCPAuditLog**: Tracks interactions from external MCP clients (William, Atlas, etc.).
- **SyncJob**: Tracks the status of background ingestion tasks.

## 3. Retrieval Flow
The fragmented search logic has been consolidated into a single `RetrievalService` (`app/services/retrieval.py`).
1. **Semantic Embedding**: The user/agent query is embedded using the primary LLM provider.
2. **Vector Similarity**: We perform a vector distance search (L2) against the `Embedding` table.
3. **Hard Constraints**: Results are strongly scoped to the specific `organization_id` and filtered out if the node status is `superseded` (unless explicitly requested).
4. **Provenance Attachment**: For each matched `Node`, its corresponding `Evidence` rows are fetched and attached to the result payload.
5. **Structured Output**: The pipeline outputs a standardized `ContextPackage` format which is consumed identically by both the REST API (`/api/v1/context/query`) and the MCP Server (`search_context`, `answer_from_workspace`).

## 4. Ingestion Flow (Reflection Engine)
Raw logs (e.g., `UniversalEvent`) are passed through the `ReflectionService`. The engine queries the LLM to extract Nodes, Edges, and Evidence linkages. The `Evidence` is saved with its raw text, and its `Embedding` is computed and stored.

## 5. Next Recommended Phase
Phase 2 (Handoff & Execution). Focus on defining and implementing cross-agent communication (e.g., TaskHandoff flows between Clario, William, and Atlas) using the established Graph context.
