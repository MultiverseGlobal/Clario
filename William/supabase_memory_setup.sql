-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create the semantic memories table
create table if not exists semantic_memories (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  embedding vector(1536) not null, -- using OpenAI text-embedding-3-small
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create a function to search for memories
create or replace function match_memories (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    semantic_memories.id,
    semantic_memories.content,
    semantic_memories.metadata,
    1 - (semantic_memories.embedding <=> query_embedding) as similarity
  from semantic_memories
  where 1 - (semantic_memories.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
