import yt_dlp

URLS = ['https://www.youtube.com/playlist?list=PL-lQBI1NdUQEPfcRXuZ8ANERYfN-tf2cP']

ydl_opts = {
    'format': 'm4a/bestaudio/best',
    # ℹ️ See help(yt_dlp.postprocessor) for a list of available Postprocessors and their arguments
    'postprocessors': [{  # Extract audio using ffmpeg
        'key': 'FFmpegExtractAudio',
        'preferredcodec': 'm4a',
    }],
    'outtmpl': "%(id)s-_=_-%(playlist_id)s.%(ext)s",
    'cookiefile': "cookies.txt"
}

with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    error_code = ydl.download(URLS)
    print(error_code)
