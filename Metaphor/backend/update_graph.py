import re

with open('app/models/graph.py', 'r') as f:
    content = f.read()

# Add workspace_id to Node
content = re.sub(
    r'(organization_id: uuid\.UUID = Field\(foreign_key="organizations\.id", index=True\))',
    r'\1\n    workspace_id: Optional[uuid.UUID] = Field(default=None, foreign_key="workspaces.id", index=True)',
    content
)

with open('app/models/graph.py', 'w') as f:
    f.write(content)

print("Modified graph.py")
