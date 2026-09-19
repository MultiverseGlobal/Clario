import re

with open('app/models/operations.py', 'r') as f:
    content = f.read()

# APIKey
content = re.sub(
    r'(id: uuid\.UUID = Field\(default_factory=uuid\.uuid4, primary_key=True\)\n\s*organization_id: uuid\.UUID = Field\(foreign_key="organizations\.id", index=True\))',
    r'\1\n    consumer_id: Optional[uuid.UUID] = Field(default=None, foreign_key="consumers.id", index=True)',
    content
)

# MCPOAuthClient
content = re.sub(
    r'(organization_id: uuid\.UUID = Field\(foreign_key="organizations\.id", index=True\)\n\s*created_at: datetime = Field\(default_factory=datetime\.utcnow, sa_column=Column\(DateTime\(timezone=True\)\)\))',
    r'organization_id: uuid.UUID = Field(foreign_key="organizations.id", index=True)\n    consumer_id: Optional[uuid.UUID] = Field(default=None, foreign_key="consumers.id", index=True)\n    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True)))',
    content
)

# MCPOAuthToken
content = re.sub(
    r'(user_id: uuid\.UUID = Field\(foreign_key="users\.id", index=True\)\n\s*scope: str = Field\(default="read:workspace"\))',
    r'\1\n    consumer_id: Optional[uuid.UUID] = Field(default=None, foreign_key="consumers.id", index=True)',
    content
)

with open('app/models/operations.py', 'w') as f:
    f.write(content)

print("Modified operations.py")
