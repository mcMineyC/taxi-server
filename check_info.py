import json, os

f = json.load(open("config/all.json", "r"))

artistCount = 0
albumCount = 0
songCount = 0

for x in f["entries"]:
    artistCount += 1
    for xy in x["albums"]:
        albumCount += 1
        for xyz in x["albums"][xy]["songs"]:
            songCount += 1
oldInfo = {
    "artists": artistCount,
    "albums": albumCount,
    "songs": songCount
}
oldArtists = artistCount
oldAlbums = albumCount
oldSongs = songCount

if(not os.path.exists(os.path.join(os.getcwd(), 'configged', 'all.json'))):
    print(json.dumps(oldInfo))
    os._exit(0)

f = json.load(open("configged/all.json", "r"))

artistCount = 0
albumCount = 0
songCount = 0

for x in f["entries"]:
    artistCount += 1
    for xy in x["albums"]:
        albumCount += 1
        for xyz in x["albums"][xy]["songs"]:
            songCount += 1

newInfo = {
    "artists": artistCount,
    "albums": albumCount,
    "songs": songCount
}

changedInfo = {
    "artists": artistCount-oldArtists,
    "albums": albumCount-oldAlbums,
    "songs": songCount-oldSongs
}

print(json.dumps({"old": oldInfo, "new": newInfo, "changed": changedInfo}))