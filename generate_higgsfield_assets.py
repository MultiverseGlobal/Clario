import os
import time
from higgsfield_client import Client

# Make sure you have HIGGSFIELD_API_KEY set in your environment
API_KEY = os.getenv("HIGGSFIELD_API_KEY")

if not API_KEY:
    print("❌ HIGGSFIELD_API_KEY is not set. Please set it before running.")
    exit(1)

client = Client(api_key=API_KEY)

def generate_video(prompt: str, output_path: str):
    print(f"🚀 Generating video for prompt: '{prompt}'...")
    try:
        # Example using a video generation model like seedance 2.5
        response = client.videos.generate(
            model="seedance-2.5", # Or kling-v3.0, veo-3.1
            prompt=prompt,
            fps=60,
            duration=3.0,
            format="webm"
        )
        
        # Hypothetical poll for completion depending on SDK design
        job_id = response.id
        print(f"⏳ Job {job_id} started. Waiting for completion...")
        
        while True:
            status = client.videos.get_status(job_id)
            if status.state == "completed":
                print(f"✅ Download ready for {output_path}")
                video_bytes = client.videos.download(job_id)
                with open(output_path, "wb") as f:
                    f.write(video_bytes)
                break
            elif status.state == "failed":
                print(f"❌ Job failed: {status.error}")
                break
            time.sleep(2)
            
    except Exception as e:
        print(f"❌ Error during generation: {e}")

if __name__ == "__main__":
    frontend_public_dir = os.path.join("Metaphor", "frontend", "public")
    os.makedirs(frontend_public_dir, exist_ok=True)
    
    # 1. Neural Memory Node
    neural_node_prompt = (
        "A cinematic 3D glassmorphic sphere with glowing cognitive filaments pulsing inside, "
        "dark mode background, high-end tech aesthetic, incredibly detailed, abstract neural "
        "network node, smooth 60fps loop, vibrant cyan and emerald accents, spatial UI feeling, "
        "no text, clean composition."
    )
    neural_node_path = os.path.join(frontend_public_dir, "neural_memory_node.webm")
    generate_video(neural_node_prompt, neural_node_path)

    # 2. Spatial Background Loop
    spatial_bg_prompt = (
        "A subtle, dark, atmospheric background of flowing data particles and deep spatial depth, "
        "glowing dot-matrix patterns moving slowly, volumetric lighting, dark surface aesthetics, "
        "perfect for a landing page background, highly cinematic, deep blacks with subtle teal "
        "and emerald hues, smooth infinite loop."
    )
    spatial_bg_path = os.path.join(frontend_public_dir, "spatial_background_loop.webm")
    generate_video(spatial_bg_prompt, spatial_bg_path)
    
    print("🎉 All assets generated successfully! You can now run the Metaphor frontend.")
