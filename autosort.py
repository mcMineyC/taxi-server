import os
import eyed3
import json
import shutil
from unicodedata import normalize
import urllib.parse
import hashlib

"""
def strip(a):
    return urllib.parse.quote(normalize("NFKD", a.lower().replace(" ", "_").replace("(", "").replace(")", "").replace("/", "").replace('"', "_").replace("\'", "_").replace("&", "-").replace(":", "-").replace(";", "-").replace(",", "-").replace("!", "-").replace("?", "-").replace("`", "-").replace("*", "-").replace("+", "-").replace("=", "-").replace("[", "-").replace("]", "-").replace("{", "-").replace("}", "-").replace("(", "-").replace(")", "-").replace("<", "-").replace(">", "-").replace("|", "-")).encode("ASCII", "ignore").decode())
"""
    


# Replace 'directory_path' with the path to the directory containing the mp3 files
directory_path = 'unsorted'

# Create a dictionary to store the ID3 tag information
tag_info = {}

# Iterate through the mp3 files in the directory
for file in os.listdir(directory_path):
    if file.endswith(".mp3"):
        audiofile = eyed3.load(os.path.join(directory_path, file))
        if audiofile.tag:
            if(audiofile is None):
                print("Skipping " + file+" because audiofile is None")
                continue
            if(audiofile.tag is None):
                print("Skipping " + file+" because audiofile.tag is None")
                continue
            if(audiofile.tag.artist is None):
                audiofile.tag.artist = "None"
                print("Skipping " + file+" because audiofile.tag.artist is None")
                continue
            if(audiofile.tag.album is None):
                audiofile.tag.album = "None"
                print("Skipping " + file+" because audiofile.tag.album is None")
                continue
            if(audiofile.tag.title is None):
                audiofile.tag.title = file.split(".mp3")[0]
            
            artist = audiofile.tag.artist.split("/")[0]
            album = audiofile.tag.album
            title = audiofile.tag.title
            
            artid = hashlib.sha256(artist.encode()).hexdigest()
            albid = hashlib.sha256(album.encode()).hexdigest()
            sid = hashlib.sha256(title.encode()).hexdigest()

            # Create the sorted directory structure
            sorted_directory = os.path.join('music', 'sorted', artid, albid)
            os.makedirs(sorted_directory, exist_ok=True)
            
            # Move the files to the sorted directory
            shutil.move(os.path.join(directory_path, file), os.path.join(sorted_directory, file))
            # Update the tag_info dictionary
            if artid not in tag_info:
                print("Creating artist entry for " + artist + " at " + artid)
                tag_info[artid] = {
                    "id": artid,
                    "displayName": artist,
                    "albums": {}
                }
                print(json.dumps(tag_info[artid], indent=4))
            if artid+"_"+albid not in tag_info[artid]["albums"]:
                print("Creating album entry for " + album + " at "+artid + "_" + albid)
                tag_info[artid]["albums"][artid + "_" + albid] = {
                    "displayName": album,
                    "songs": []
                }
            tag_info[artid]["albums"][artid + "_" + albid]["songs"].append({
                "id": artid + "_" + albid + "_" + sid,
                "title": title,
                "file": os.path.join(sorted_directory, file)
            })


# Create the JSON output

count = len(list(tag_info.values()))

if(os.path.exists("config/all.json")):
    if(count < 1):
        print("Nothing new, skipping")
        exit(0)
    print("all.json exists")
    f = open("config/all.json", "r")
    data = json.load(f)
    f.close()

    # Combine the entries from data["entries"] and list(tag_info.values())

    merged = []
    data_entries = data["entries"]
    tag_info_values = list(tag_info.values())

    for entry in data_entries:
        artist_id = entry["id"]
        found = False

        for tag_info_entry in tag_info_values:
            if artist_id == tag_info_entry["id"]:
                found = True

                # Update artist info
                tag_info_entry["displayName"] = entry["displayName"]

                # Combine albums
                for album_id, album_data in entry["albums"].items():
                    if album_id in tag_info_entry["albums"]:
                        # Combine songs in the same album
                        for song in album_data["songs"]:
                            if song not in tag_info_entry["albums"][album_id]["songs"]:
                                tag_info_entry["albums"][album_id]["songs"].append(song)
                    else:
                        # Add the new album
                        tag_info_entry["albums"][album_id] = album_data

        if not found:
            # Add new artist info
            tag_info_values.append({
                "id": entry["id"],
                "displayName": entry["displayName"],
                "albums": entry["albums"]
            })

    # Update the merged list
    merged = tag_info_values

    # merged = {
        # "entries": data["entries"] + list(tag_info.values())
    # }

    # print("adding: " + json.dumps(merged, indent=4))
    f = open("config/all.json", "w")
    json.dump({"entries":merged}, f, indent=4)
    f.close()
else:
    if(count < 1):
        print("Nothing new, skipping")
        exit(0)
    print("all.json does not exist")
    f = open("config/all.json", "w")
    json.dump({"entries":list(tag_info.values())}, f, indent=4)
    f.close()

print("Saved info to all.json")