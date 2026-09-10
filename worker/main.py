import os
import asyncio
from dotenv import load_dotenv
from supabase import create_client, Client
import logging
from handlers.sourcing import process_sourcing_run

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

async def poll_jobs():
    logger.info("Worker started, waiting for jobs...")
    while True:
        try:
            # Poll atlas_background_jobs for pending tasks
            # Note: We use the anon key here, if RLS prevents us from seeing pending jobs across all users,
            # we will need the service_role key or connect via asyncpg to bypass RLS.
            response = supabase.table("atlas_background_jobs").select("*").eq("status", "pending").limit(1).execute()
            
            if response.data:
                job = response.data[0]
                logger.info(f"Found job: {job['id']} of type {job['type']}")
                
                # Mark as processing
                supabase.table("atlas_background_jobs").update({"status": "processing"}).eq("id", job["id"]).execute()
                
                # Dispatch to handlers based on job['type']
                if job['type'] == 'sourcing_run':
                    await process_sourcing_run(supabase, job)
                
                # Mark as completed
                supabase.table("atlas_background_jobs").update({"status": "completed"}).eq("id", job["id"]).execute()
                logger.info(f"Completed job: {job['id']}")
            
            # Poll clario_jobs for pending tasks
            response_clario = supabase.table("clario_jobs").select("*").eq("status", "pending").limit(1).execute()
            if response_clario.data:
                job = response_clario.data[0]
                logger.info(f"Found clario job: {job['id']}")
                
                supabase.table("clario_jobs").update({"status": "processing"}).eq("id", job["id"]).execute()
                
                if job.get("video_url"):
                    from server import process_video_job, MEDIA_DIR
                    
                    project_id = job["id"]
                    project_dir = MEDIA_DIR / project_id
                    project_dir.mkdir(parents=True, exist_ok=True)
                    
                    def update_clario_job(jid, kwargs):
                        payload = {}
                        if "status" in kwargs: payload["status"] = kwargs["status"]
                        if "progress_pct" in kwargs: payload["progress_pct"] = kwargs["progress_pct"]
                        if "status_msg" in kwargs: payload["status_msg"] = kwargs["status_msg"]
                        if "result" in kwargs: payload["result"] = kwargs["result"]
                        
                        if payload:
                            try:
                                supabase.table("clario_jobs").update(payload).eq("id", jid).execute()
                            except Exception as e:
                                logger.error(f"Failed to update clario_jobs {jid}: {e}")
                    
                    # We await it so we don't process multiple heavy jobs simultaneously
                    await process_video_job(
                        job_id=job["id"],
                        project_id=project_id,
                        project_dir=project_dir,
                        source=job["video_url"],
                        label=job.get("title", "Clario Video"),
                        mode="video_harvester",
                        update_db=update_clario_job
                    )
                else:
                    supabase.table("clario_jobs").update({"status": "failed", "status_msg": "No video_url provided"}).eq("id", job["id"]).execute()
                
                logger.info(f"Completed clario job: {job['id']}")

        except Exception as e:
            logger.error(f"Error polling jobs: {e}")
            
        await asyncio.sleep(3)

if __name__ == "__main__":
    asyncio.run(poll_jobs())
