import asyncio
from sqlmodel import select, text
from app.database.session import get_session_context
from app.models.graph import Node, Edge, Embedding

async def main():
    try:
        async with get_session_context() as session:
            # Row counts
            nodes = (await session.execute(select(Node))).scalars().all()
            edges = (await session.execute(select(Edge))).scalars().all()
            embeddings = (await session.execute(select(Embedding))).scalars().all()
            print(f'Nodes: {len(nodes)}')
            print(f'Edges: {len(edges)}')
            print(f'Embeddings: {len(embeddings)}')
            
            if embeddings:
                # check if the embedding is real or empty array
                print(f'Sample Embedding length: {len(embeddings[0].vector) if embeddings[0].vector is not None else 0}')
                print(f'Sample Embedding type: {type(embeddings[0].vector)}')
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    asyncio.run(main())
