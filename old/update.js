'use strict';
async function updateSongs(hashFunc, all, songs){
    //This is only needed if the file changed
    console.log("Checking for updates")
    console.log(JSON.stringify(all,null,4))
    console.log("Updating songs.json")
    var albums_arr = [];
    for(var x = 0; x < (all["entries"].length); x++){
        artist = all["entries"][x]
        console.log(artist["displayName"]); //artist
        var artistId = artist["id"]
        for (var album in artist["albums"]) {
            var albumid = album;
            var album = artist["albums"][album];
            console.log("\t" + album["displayName"]); //album
            for(var song in album["songs"]) {
                var v = album["songs"][song];
                console.log("\t\t" + v["title"] + ": " + v["file"] + ""); //song
                
                if(fs.existsSync(path.join(__dirname, v["file"]))){
                    try{
                        var vv = {}
                        var found = false
                        var songer = songs["songs"]
                        if(songer != undefined){
                            for(var y = 0; y < songer.length; y++){
                                if(songer[y]["id"] == v["id"]){
                                    vv = songer[y]
                                    found = true;
                                    break;
                                }
                                // console.log({"id": v["id"], "iidd": songer[y]["id"]})
                            }
                        }
                        var z = ""
                        var dur = ""
                        if(!found && vv["duration"] == undefined){
                            console.log("\t\t\tProbing: "+v["file"])
                            z = await utils.withTimeout(ffprobe(path.join(__dirname, v["file"])), 10000);
                            dur = z["format"]["duration"]   
                        }else{
                            console.log("\t\t\tUsing duration: "+vv["duration"])
                            dur = (vv["duration"] == undefined) ? 0 : vv["duration"]
                        }
                        
                        var warr = {
                            "id": v["id"],
                            "displayName": v["title"],
                            "albumId": albumid,
                            "artistId": artistId,
                            "duration": dur,
                            "file": v["file"]
                        }
                        albums_arr.push(warr)
                    }catch(err){
                        switch(err.code){
                            case "ENOENT":
                                console.log("File does not exist: "+v["file"])
                                break;
                            case "ETIMEDOUT":
                                console.log("Timed out trying to extract data from: "+v["file"])
                                break;
                            default:
                                console.log(err)
                        }
                    }
                }else{
                    console.log("File does not exist: "+v["file"])
                }
            };
        }
    }
    console.log("Writing file...")
    songs_data = {
        "last_updated": hashFunc(JSON.stringify(all)),
        "songs": albums_arr
    }
    try{
        fs.writeFileSync(path.join(__dirname, "config", 'songs.json'), JSON.stringify(songs_data,null,4), 'utf-8');
    }catch(err){
        console.log("Error writing songs.json, retrying...")
        try{
            fs.mkdirSync(path.join(__dirname, 'config'));
            fs.writeFileSync(path.join(__dirname, "config", 'songs.json'), JSON.stringify(songs_data,null,4), 'utf-8');
        }catch(err){
            console.log(err)
        }
    }
    console.log("Done updating songs!")
}

async function updateAlbums(hashFunc, all){
    var albums_arr = [];

    console.log("Updating albums.json")
    for(var x = 0; x < (all["entries"].length); x++){
        artist = all["entries"][x]
        console.log(artist["displayName"]); //artist
        for (var album in artist["albums"]) {
            var albumid = album;
            var album = artist["albums"][album];
            console.log("\t" + album["displayName"]); //album
            var warr = {
                "id": albumid,
                "displayName": album["displayName"],
                "artist": artist["displayName"],
                "artistId": artist["id"]
            }
            albums_arr.push(warr)
        }
    }
    var albums_data = {
        "last_updated": hashFunc(JSON.stringify(all)),
    }
    albums_data["albums"] = albums_arr
    console.log("\n\n")
    console.log(albums_data)
    try{
        fs.writeFileSync(path.join(__dirname, "config", 'albums.json'), JSON.stringify(albums_data,null,4), 'utf-8');
    }catch(err){
        console.log("Error writing songs.json, retrying...")
        try{
            fs.mkdirSync(path.join(__dirname, 'config'));
            fs.writeFileSync(path.join(__dirname, "config", 'albums.json'), JSON.stringify(albums_data,null,4), 'utf-8');
        }catch(err){
            console.log(err)
        }
    }
    console.log("Done updating albums!")
}

async function updateArtists(hashFunc, all){
    //This is only needed if the file changed
    console.log("Checking for updates")
    console.log(JSON.stringify(all,null,4))
    console.log("Updating")
    var albums_arr = [];
    console.log("Updating")
    for(var x = 0; x < (all["entries"].length); x++){
        artist = all["entries"][x]
        console.log(artist["displayName"]);
        var warr = {
            "id": artist["id"],
            "displayName": artist["displayName"],
        }
        artist_arr.push(warr)
    }
    artist_data["artists"] = artist_arr
    console.log("\n\n")
    console.log(artist_data)
    console.log("Writing file...")
    songs_data = {
        "last_updated": hashFunc(JSON.stringify(all)),
        "songs": albums_arr
    }
    try{
        fs.writeFileSync(path.join(__dirname, "config", 'artists.json'), JSON.stringify(artists_data,null,4), 'utf-8');
    }catch(err){
        console.log("Error writing artists.json, retrying...")
        try{
            fs.mkdirSync(path.join(__dirname, 'config'));
            fs.writeFileSync(path.join(__dirname, "config", 'artists.json'), JSON.stringify(artists_data,null,4), 'utf-8');
        }catch(err){
            console.log(err)
        }
    }
    console.log("Done updating artists!")
}

async function updateAuth(hashFunc, auth){

}

async function updateAll(hashFunc, all, songs, auth){
    var updated = false;
    if(!fs.existsSync(path.join(__dirname, 'albums.json'))){
        await updateAlbums(hash5,all)
        updated = true
    }
    if(!fs.existsSync(path.join(__dirname, 'artists.json'))){
        await updateArtists(hash5,all)
        updated = true
    }
    if(!fs.existsSync(path.join(__dirname, 'songs.json'))){
        await updateSongs(hash5,all)
        updated = true
    }
    if(updated) console.log("Done updating everything!")
}
