import json, sys
print(json.dumps({"message": "Starting", "completed": 0, "total": 0, "name": ""}))
sys.stdout.flush()
from spotdl import Spotdl
from spotdl.download.downloader import Downloader
from spotdl.types.options import DownloaderOptions
from spotdl.download.progress_handler import ProgressHandler, SongTracker
import time

def printer(junk, message):
    completed = junk.parent.overall_completed_tasks
    total = junk.parent.song_count
    name = junk.song_name
    print(json.dumps({"type": "progress", "message": message, "completed": completed, "total": total, "name": name}))
    sys.stdout.flush()

obj = Spotdl(client_id="0a65ebdec6ec4983870a7d2f51af2aa1", client_secret="22714014e04f46cebad7e03764beeac8", no_cache=True)
time.sleep(0.2)
dl = Downloader(DownloaderOptions(simple_tui=True))
ph = ProgressHandler(True, printer, False)
dl.progress_handler = ph
obj.downloader = dl
print(json.dumps({"type": "status", "message": "Searching", "completed": 0, "total": 0, "name": ""}))
print(json.dumps({"type": "status", "message": "Args: " + sys.argv[1], "completed": 0, "total": 0, "name": ""}))
songs_obj = obj.search(sys.argv[1])
print(json.dumps({"type": "status", "message": "Starting download", "completed": 0, "total": len(songs_obj), "name": ""}))
sys.stdout.flush()
obj.download_songs(songs_obj)
print(json.dumps({"type": "status", "message": "Download complete", "completed": -1, "total": -1, "name": ""}))
sys.stdout.flush()