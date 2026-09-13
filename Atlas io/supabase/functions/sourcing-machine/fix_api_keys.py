import sys
import re

file_path = r'C:\Users\SUDO\Documents\Pseudonyms\Atlas io\supabase\functions\sourcing-machine\index.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# We know dbSettings is declared around line 688. 
# We need to add the global API key variables right after we have dbSettings.
# Then, replace all local declarations.

new_content = content.replace(
    'const proxyConfig: ProxyConfig | undefined = dbSettings?.proxy_url',
    '''const groqApiKey = dbSettings?.groq_api_key || Deno.env.get("GROQ_API_KEY");
    const kimiApiKey = dbSettings?.kimi_api_key || Deno.env.get("KIMI_API_KEY") || Deno.env.get("MOONSHOT_API_KEY");
    const nimApiKey = dbSettings?.nim_api_key || Deno.env.get("NVIDIA_NIM_API_KEY");
    const openaiApiKey = dbSettings?.openai_api_key || Deno.env.get("OPENAI_API_KEY");

    const proxyConfig: ProxyConfig | undefined = dbSettings?.proxy_url'''
)

# Remove the local declarations
new_content = new_content.replace('const groqApiKey = Deno.env.get("GROQ_API_KEY");\n', '')
new_content = new_content.replace('const kimiApiKey = Deno.env.get("KIMI_API_KEY") || Deno.env.get("MOONSHOT_API_KEY");\n', '')
new_content = new_content.replace('const nimApiKey = Deno.env.get("NVIDIA_NIM_API_KEY");\n', '')

# Remove indented ones
new_content = new_content.replace('      const groqApiKey = Deno.env.get("GROQ_API_KEY");\n', '')
new_content = new_content.replace('      const kimiApiKey = Deno.env.get("KIMI_API_KEY") || Deno.env.get("MOONSHOT_API_KEY");\n', '')
new_content = new_content.replace('      const nimApiKey = Deno.env.get("NVIDIA_NIM_API_KEY");\n', '')

# For some places where they were assigned via let
new_content = new_content.replace('      const groqApiKey = Deno.env.get("GROQ_API_KEY") || Deno.env.get("KIMI_API_KEY");\n', '')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Success')
