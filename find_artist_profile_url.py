import spotipy, json, sys
from spotipy.oauth2 import SpotifyClientCredentials
crds = json.load(open("creds.json"))
sp = spotipy.Spotify(client_credentials_manager=SpotifyClientCredentials(client_id=crds["id"],client_secret=crds["secret"]))
q = "C418"
if not (len(sys.argv) > 1):
    print("Missing query")
    exit(1)
else:
    q = ""
    for x in range(1,len(sys.argv)):
        x = sys.argv[x]
        q = q + " " + x
    q = q[1:]

r = sp.search(q="artist:"+q, type="artist")
items = r["artists"]["items"]
if len(items) > 0:
    artist = items[0]
    if(artist["images"] == []):
        s = {
            "success": False,
            "name": q,
            "url": "http://localhost:3000/placeholder",
            "q": q
        }
        print(json.dumps(s))
        exit(0)
    s = {
        "success": True,
        "name": artist["name"],
        "url": artist["images"][0]["url"],
        "q": q
    }
    print(json.dumps(s))
else:
    s = {
        "success": False,
        "name": q,
        # "url": "http://localhost:3000/placeholder",
        "q": q
    }
    print(json.dumps(s))