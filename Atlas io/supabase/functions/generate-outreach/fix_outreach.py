import sys
import re

file_path = r'C:\Users\SUDO\Documents\Pseudonyms\Atlas io\supabase\functions\generate-outreach\index.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# I will replace the providers.length === 0 block and finalRes check completely.

content = content.replace(
"""    if (providers.length === 0) {
      console.warn("No LLM API keys configured. Using fallback.");
      result = buildFallback(company, founderName, bottleneckArea, hypothesis);
    }""", 
""
)

content = content.replace(
"""    let finalRes: Response | null = null;
    let result: any = null;
    let usedProvider = "";""",
"""    let finalRes: Response | null = null;
    let result: any = null;
    let usedProvider = "";

    if (providers.length === 0) {
      console.warn("No LLM API keys configured. Using fallback.");
      result = buildFallback(company, founderName, bottleneckArea, hypothesis);
    }"""
)

content = content.replace(
"""    if (!finalRes && !result) {
      throw new Error("All AI models failed to generate valid outreach copy.");
    }""",
"""    if (!finalRes && !result) {
      console.warn("All AI models failed, using hardcoded fallback.");
      result = buildFallback(company, founderName, bottleneckArea, hypothesis);
    }"""
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Success')
