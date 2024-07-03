//Just some crazy stuff I found in a Stack Overflow
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const path = require('path');
import {fileURLToPath} from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const jsmt = require('jsmediatags');
import schemas from './schemas.js';
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const axios = require('axios');
const crypto = require('crypto');
const SpottyDL = require('spottydl-better');
const http = require('http');
const { Server } = require("socket.io");
const { SpotifyApi } = require("@spotify/web-api-ts-sdk");
const clientID = "0a65ebdec6ec4983870a7d2f51af2aa1";
const secretKey = "22714014e04f46cebad7e03764beeac8";
const { waitUntil } = require('async-wait-until');

const { RxDBDevModePlugin } = require('rxdb/plugins/dev-mode');
const { createRxDatabase, addRxPlugin } = require('rxdb');
import { getRxStorageMongoDB } from 'rxdb/plugins/storage-mongodb';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
addRxPlugin(RxDBMigrationSchemaPlugin);
addRxPlugin(RxDBQueryBuilderPlugin);

const db = await createRxDatabase({
  name: 'rxdb-taxi',
  storage: getRxStorageMongoDB({
    connection: 'mongodb://rxdb-taxi:dexiewasbad@192.168.30.36:27017/?authSource=admin',
  }),
});

await schemas.register(db, 3);
console.log("Added collections");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    }
});
const port = 3000;
app.use(cors());
app.use(bodyParser.json({limit: '50mb'}));

app.use('/',express.static(path.join(__dirname, 'static')));

app.post('/latestCommit', async function (req, res) {
    exec('git rev-parse HEAD', (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            res.send({"commit": "error"})
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            res.send({"commit": "error"})
            return;
        }
        res.send({"commit": stdout.replace("\n", "")})
    })
})

app.post('/status', function (req, res) {
    res.send({"status": "ok"})
})

app.get('/status', function (req, res) {
    res.send({"status": "ok"})
})

app.post('/auth', async function (req, res) {
    var authed = false
    var authtoken = "";
    var result = await db.auth.findOne({selector: {"loginName": req.body.username}}).exec();
    var username = result == null ? "" : result.loginName
    authed = await (async ()=>{
        if(!result || result.loginName != req.body.username){
            console.error("Wat da refrigerator is going on here");
            return Promise.resolve(false);
        }
        
        if(result.password == req.body.password){
            console.log("Authorizing user "+result.loginName)
            authtoken = crypto.randomBytes(64).toString('hex');
            await result.patch({
                authtoken: authtoken,
            })
            return Promise.resolve(true);
        }else if(result.password == ""){
            console.log("Authorizing user "+result.loginName+" and changing password to "+req.body.password);
            authtoken = crypto.randomBytes(64).toString('hex');
            await result.patch({
                password: req.body.password,
                authtoken: authtoken,
            })
            return Promise.resolve(true);
        }else{
            return Promise.resolve(false);
        }
    })();
    
    if(authed == false){
        console.log("Failed to authorize user "+req.body.username)
    }
    res.send({"authorized": authed, "authtoken": authtoken, "username": username})
});

app.post('/authtoken', async function (req, res) {
    const result = await db.auth.findOne({selector: {"authtoken": req.body.authtoken}}).exec();
    var username = "";
    var authtoken = "";
    var authed = await (async ()=>{
        if(!result){
            return Promise.resolve(false);
        }
        username = result.loginName
        authtoken = (username == "testguy") ? "1234567890" : crypto.randomBytes(64).toString('hex');
        await result.patch({
            authtoken: authtoken,
        });
        return Promise.resolve(true);
    })();
    
    res.send({"authorized": authed, "authtoken": authtoken, "username": username})
})

app.post('/username', async function (req, res) {
    const result = await db.auth.findOne({selector: {"authtoken": req.body.authtoken}}).exec();
    var username = "";
    var authtoken = "";
    var authed = await (async ()=>{
        if(!result){
            return Promise.resolve(false);
        }
        username = result.loginName
        authtoken = result.authtoken
        return Promise.resolve(true);
    })();
    
    res.send({"authorized": authed, "authtoken": authtoken, "username": username})
})

///   THIS IS USELESS IDK WHY ITS STILL HERE   ///
// app.post('/info/all', async function (req, res) {
//     if((await checkAuth(req.body.authtoken)) == false){
//         res.send({"authed": false});
//         return
//     }
//     // var resp = await db.songs.find().exec();
//     res.send({"authorized": true, "entries": {}});
// });

app.get('/placeholder', function (req, res) {
    res.sendFile(path.join(__dirname, "config", 'images', 'placeholder.jpg'));
})

app.post('/info/albums', async function (req, res) {
    if((await checkAuth(req.body.authtoken)) == false){
        res.send({"authed": false, "albums": []});
        return
    }

    const data = await db.albums.find({sort: [{artistId: "asc"}, {added: "asc"}]}).exec();
   res.send({"authed": true, "albums": data});
});

app.post('/info/artists', async function (req, res) {
    if((await checkAuth(req.body.authtoken)) == false){
        res.send({"authed": false, "artists": []});
        return
    }
    
    const data = await db.artists.find({
        sort: [
            {displayName: "asc"}
        ]
    }).exec();
    res.send({"authed": true, "artists": data});
});

app.post('/info/songs', async function (req, res) {
    if((await checkAuth(req.body.authtoken)) == false){
        res.send({"authed": false, "songs": []});
        return
    }
    
    const data = await db.songs.find({sort: [{"added": "desc"}]}).exec();
    console.log(data[0]);
    res.send({"authed": true, "songs": data});
});

app.post('/info/songs/by/album/:id', async function (req, res) {
    if((await checkAuth(req.body.authtoken)) == false){
        res.send({"authed": false, "songs": []});
        return
    }

    const data = await db.songs.find({selector: {albumId: req.params.id}, sort: [{"artistId": "asc"}, {"albumId": "asc"}]}).exec();
    res.send({"authed": true, "songs": data});
});

app.post('/info/songs/by/artist/:id', async function (req, res) {
    if((await checkAuth(req.body.authtoken)) == false){
        res.send({"authed": false, "songs": []});
        return
    }

    const data = await db.songs.find({selector: {artistId: req.params.id}, sort: [{"artistId": "asc"}, {"albumId": "asc"}]}).exec();
    res.send({"authed": true, "songs": data});
});

app.post('/info/songs/batch', async function (req, res) {
    if((await checkAuth(req.body.authtoken)) == false){
        res.send({"authed": false, "results": {}});
        return;
    }
    
    var ids = req.body.ids
    var results = {}
    for(var i = 0; i < ids.length; i++){
        results[ids[i]] = await db.songs.findOne({selector: {"id": ids[i]}}).exec();
    }
    res.send({"authed": true, "results": results});
});

app.post('/info/songs/:id', async function (req, res) {
    if((await checkAuth(req.body.authtoken)) == false){
        res.send({"authed": false, "songs": []});
        return
    }

    const result = await db.songs.findOne({selector: {"id": req.params.id}}).exec();
    res.send({"authed": true, "song": (result) ? result : {} }); 
});

app.get('/info/songs/:id/image', async function (req, res) {
    var file = "";

    if(!fs.existsSync(path.join(__dirname, "config", "images", "songs", req.params.id+".png"))){
        //Find file
        file = await db.songs.findOne({selector: {"id": req.params.id}}).exec();
        file = (file == null) ? "" : file.file;

        //Check if file was found
        if(file == ""){
            console.log("No file associated with "+req.params.id)
            res.sendFile(path.join(__dirname, "config", "images", "placeholder.jpg"));
            return
        }

        //Extract image
        await extractSongImage(file, path.join(__dirname, "config", "images", "songs", req.params.id+".png"));
        if(!(fs.existsSync(path.join(__dirname, "config", "images", "songs", req.params.id+".png")))){
            console.log("File still doesn't exist, trying to infer based on other songs in album...");
            await inferSongImage(file, req.params.id);
        }
    }

    //Send image or placeholder if it fails
    if(fs.existsSync(path.join(__dirname, "config", "images", "songs", req.params.id+".png"))){
        res.sendFile(path.join(__dirname, "config", "images", "songs", req.params.id+".png"));
    } else{
        console.log("Still couldn't conjure image for "+req.params.id+".  Sending placeholder")
        res.sendFile(path.join(__dirname, "config", "images", "placeholder.jpg"));
    }
});

app.get('/info/albums/:id/image', async function (req, res) {
    if(!(fs.existsSync(path.join(__dirname, "config", "images", "albums", req.params.id+".png")))){
        await extractAlbumImage(req.params.id)
    }
    //Send image or placeholder if it fails
    if(fs.existsSync(path.join(__dirname, "config", "images", "albums", req.params.id+".png"))){
        res.sendFile(path.join(__dirname, "config", "images" , "albums", req.params.id+".png"));
    } else{
        console.log("Still couldn't conjure image for "+req.params.id+".  Sending placeholder")
        res.sendFile(path.join(__dirname, "config", "images" , "placeholder.jpg"));
    }
});

app.get('/info/artists/:id/image', async function (req, res) {
    var data = {}
    var url = "";
    if(!(fs.existsSync(path.join(__dirname, "config", "images", "artists", req.params.id+".png")))){
        var name = (await db.artists.findOne({selector: {"id": req.params.id}}).exec()).displayName
        console.log(name)
        console.log("Artist image doesn't exist, downloading...");
        const { stdout, stderr } = await exec('python3 find_artist_profile_url.py "'+name+'"')
        console.log(stdout)
        try{
            data = JSON.parse(stdout)
            
            if(data["success"]){
                url = data["url"];
                await downloadFile(url, path.join(__dirname, "config", "images", "artists", req.params.id+".png"));
            }
            if(!data["success"]){
                console.log("\tFailed to get image for "+req.params.id+".")
                var albumid = (await db.albums.findOne({selector: {"artistId": req.params.id}}).exec()).id
                console.log("\t\tExtracting image from album "+albumid)
                await extractAlbumImage(albumid, path.join(__dirname, "config", "images", "artists", req.params.id+".png"))
                console.log("\t\tImage extracted.")
            }
        }catch (err){
            console.log(err)
            res.sendFile(path.join(__dirname, "config", "images" , "placeholder.jpg"));
            return
        }
    }

    //Send image or placeholder if it fails
    if(fs.existsSync(path.join(__dirname, "config", "images", "artists", req.params.id+".png"))){
        console.log("Sending image for "+req.params.id+".")
        res.sendFile(path.join(__dirname, "config", "images" , "artists", req.params.id+".png"));
    } else{
        console.log("Couldn't conjure image for "+req.params.id+".  Sending placeholder")
        res.sendFile(path.join(__dirname, "config", "images" , "placeholder.jpg"));
    }
})

// app.get('/info/songs/:id/audio', async function (req, res) {
//     var id = req.params.id
//     const now = new Date();
//     const month = now.getMonth() + 1; // getMonth() returns a zero-based index, so add 1
//     const day = now.getDate();
//     if(month == 4 && day == 1 && getRandomInt(0,100) > 690){
//         console.log("Making chaos")
//         var inty = getRandomInt(0, data["songs"].length-1);
//         if(data["songs"][inty]["artistId"] == "939644cef5b866870668f6cb59a0db900853c63ac1b97348e832c65e271964fd"){
//             res.sendFile(path.join(__dirname, "music/sorted/1d822fde641a597beb59ba197388b85e40eafb39d007be53f1c1da9b36d6a8df/00879b25b7e52685100c540611c16c5974b224ef79c692a9f58e43764532064d/Never Gonna Give You Up.mp3"))
//         }else{
//             res.sendFile(path.join(__dirname, data["songs"][inty]["file"])); // data["songs"][inty]["file"]
//             console.log(data["songs"][inty]["file"])
//         }
//         if(getRandomInt(0,1) == 0){
//             console.log("No Chaoz")
//             return
//         }
//     }
//     var file = "";
//
//     //Find file
//     var file = (await db.songs.findOne({selector: {"id": id}}).exec()).file
//     if(typeof(req.query.uname) != "undefined"){
//         console.log("Adding "+id+" to recently played for "+req.query.uname);
//         addToRecentlyPlayed(req.query.uname, id);
//     }
//     console.log(path.join(__dirname, file))
//     if(fs.existsSync(path.join(__dirname, file))){
//         res.sendFile(path.join(__dirname, file));
//     } else{
//         res.send("error");
//     }
// })

// there were some unused endpoints in here pertaining to querying albums/songs by album/artist, those are removed

app.post('/playlists', async function(req, res){
    if((await checkAuth(req.body.authtoken)) == false){
        res.send({"authed": false, "playlists": []});
        return
    }

    var u = await getUser(req.body.authtoken);
    var playlists = await db.playlists.find({selector: {$or: [{owner: u}, {public: true}]}}).exec();
    res.send({"authed": true, "playlists": playlists})
})

app.post('/playlists/user/:id', async function(req, res){
    if((await checkAuth(req.body.authtoken)) == false){
        res.send({"authed": false, "playlists": []});
        return
    }
    var u = await getUser(req.body.authtoken);
    if(u != req.params.id){
        // res.send({authed: false, "error": "Not authorized", "success": false})
        // return
    }

    var d = await db.playlists.find({selector: {owner: req.params.id}}).exec();
    res.send({"authed": true, "playlists": d});
})

app.post('/playlists/modify/:playlist', async function(req, res){
    if((await checkAuth(req.body.authtoken)) == false){
        res.send({"authed": false});
        return
    }
    var u = await getUser(req.body.authtoken);
    var p = await db.playlists.findOne({selector: {id: req.params.playlist}}).exec();
    if(p == null){
        console.log("Playlist does not exist. Creating new playlist.")
        p = await db.playlists.upsert({
            id: req.params.playlist || "banana",
            owner: u || "testguy",
            displayName: req.body.name || "Banana",
            description: req.body.description || "Banana",
            public: req.body.public || false,
            songs: req.body.songs || [],
        })
    }else{
        if(p.owner == undefined || p.owner == null){
            await p.incrementalPatch({owner: u});
        }else if(u != p.owner){
            res.send({authed: false, "error": "Not authorized", "success": false})
            return;
        }
        var newdata = {}
        console.log("Attempting to modify playlist "+req.params.playlist)
        if(req.body.name !== undefined){
            console.log("Name: "+req.body.name)
            newdata["displayName"] = req.body.name
        }else{
           newdata["displayName"] = p.displayName
        }
        if(req.body.description !== undefined){
           console.log("Description: "+req.body.public)
           newdata["description"] = req.body.description
        }else{
            newdata["description"] = p.description
        }
        if(req.body.public !== undefined){
            console.log("Public: "+req.body.public)
            newdata["public"] = JSON.parse(req.body.public)
        }else{
            newdata["public"] = p.public
        }
        if(typeof req.body.songs !== "undefined" && req.body.songs != null && req.body.songs.length > 0){
            newdata["songs"] = req.body.songs
        }else{
            newdata["songs"] = p.songs
        }
        console.log("Patching existing playlist")
        await p.patch(newdata);
    }
    res.send({authed: true, "success": true, playlists: await db.playlists.find({selector: {$or: [{owner: u}, {public: true}]}}).exec()});
})

app.post('/playlists/remove/:playlist', async function(req, res){
    if((await checkAuth(req.body.authtoken)) == false){
        res.send({"authed": false, "songs": []});
        return
    }
    var u = await getUser(req.body.authtoken);
    var p = await db.playlists.findOne({selector: {id: req.params.playlist}}).exec();
    if(p == null){
        res.send({authed: true, "success": true, "playlists": await db.playlists.find({selector: {$or: [{owner: u}, {public: true}]}}).exec()});
        return;
    }
    if(u != p.owner){
        res.send({authed: false, "error": "Not authorized", "success": false})
        return
    }
    await p.remove();
    res.send({authed: true, "success": true, "playlists": await db.playlists.find({selector: {$or: [{owner: u}, {public: true}]}}).exec()});
})

app.post('/recently-played/:user/add', async function(req, res){
    if((await checkAuth(req.body.authtoken)) == false){
        res.send({"authed": false, "success": false})
        return
    }
    var u = await getUser(req.body.authtoken);
    var user = req.params.user;
    console.log(user, "r==a", u);
    if(user != u){
        res.send({"error": "Unauthorized", "authed": true, "success": false})
        return
    }
    await addToRecentlyPlayed(user, req.body.id);
    res.send({"authed": true, "success": true})
})

app.post('/recently-played/:user', async function(req, res){
    if((await checkAuth(req.body.authtoken)) == false){
        res.send({"authed": false, played: []});
        return
    }
    var u = await getUser(req.body.authtoken);
    var user = req.params.user;
    console.log(user, "r==a" ,u)
    if(user != u){
        // res.send({"error": "Not authorized", "authed": false, "success": false, "played": []})
        // return
    }
    var played = await db.played.findOne({selector: {owner: req.params.user}}).exec();
    if(played == null){
      res.send({"played": [], "authed": true, "success": true})
      return
    }
    res.send({"played": played.songs.filter(n => n).filter(n => n != "idklol") || [], "authed": true, "success": true})
});

app.post('/favorites/:user', async function(req, res){
    if((await checkAuth(req.body.authtoken)) == false){
        res.send({"authed": false, songs: []});
        return
    }
    var u = await getUser(req.body.authtoken);
    var user = req.params.user;
    console.log(user,"r==a",u)
    if(user != u){
        // res.send({"error": "Not authorized", "authed": false, "success": false, "songs": []})
        // return
    }
    var favorite = await db.favorites.findOne({selector: {owner: user}}).exec();
    if(favorite == null){
        favorite = {owner: user, songs: [], count: 0}
        await db.favorites.upsert(favorite)
    }
    res.send({"songs": favorite.songs || [], "count": favorite.songs.length, "authed": true, "success": true})
})

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.emit("authprompt", "3141592653589793238464")
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
    var authed = false
    socket.on("auth", async (msg) => {
        if(typeof(msg) == "string"){
            msg = JSON.parse(msg);
        }
        var aut = await checkAuth(msg.authtoken);
        console.log(aut, msg.authtoken, typeof(msg));
        if(!aut){
            socket.emit("authresult", {"success": false, "error": "Invalid authtoken", "authorized": false})
            return
        }
        socket.emit("authresult", {"success": true, "authorized": true})
        authed = true;
    })
    socket.on("search", async (msg) => {
        if(!authed){
            socket.emit("message", {"type": "auth", "success": false, "error": "Invalid authtoken", "authorized": false})
            return
        }
        if(typeof(msg) == "string"){
            msg = JSON.parse(msg);
        }
        if(msg.source == "spotify"){
            if(msg.query == ""){
                socket.emit("message", {"type": "error", "success": false, "error": "No query provided", "authorized": true})
                return
            }
            const api = SpotifyApi.withClientCredentials(
                clientID,
                secretKey
            );
            var page = 0
            if(typeof(msg.page) == "number"){
                page = msg.page
            }
            var items = []
            if(msg.mediaType == "all"){
                const trackItems = await api.search(msg.query, "track", undefined, 50, page);
                items = trackItems.tracks.items
            }else{
                items = await api.search(msg.query, msg.mediaType, undefined, 50, page);
                items = items[msg.mediaType+"s"].items
            }

            items = items.map((item) => item.type == "track" ? ({
                id: typeof(item.id) == "string" ? item.id : "",
                name: typeof(item.name) == "string" ? item.name : "",
                artist: typeof(item.artists) == "object" && typeof(item.artists[0].name) == "string" ? item.artists[0].name : "",
                album: typeof(item.album) == "object" && typeof(item.album.name) == "string" ? item.album.name : "",
                imageUrl: typeof(item.album) == "object" && item.album.images[0] ? (item.album.images.sort((a, b) => b.width - a.width)[0].url) : "",
                type: "song",
            }) : (item.type == "album" ? ({
                id: typeof(item.id) == "string" ? item.id : "",
                name: typeof(item.name) == "string" ? item.name : "",
                album: "",
                artist: typeof(item.artists) == "object" && typeof(item.artists[0].name) == "string" ? item.artists[0].name : "",
                imageUrl: typeof(item.images) == "object" && item.images[0] ? item.images[0].url : "",
                type: "album"
            }) : (item.type == "artist" ? ({
                id: typeof(item.id) == "string" ? item.id : "",
                name: typeof(item.name) == "string" ? item.name : "",
                album: "",
                artist: "",
                imageUrl: typeof(item.images) == "object" && item.images[0] ? item.images[0].url : "",
                type: "artist",
            }) : item)));
            socket.emit("searchresults", {"type": msg.mediaType, "results": items})
        }else if (msg.source == "youtube"){
            socket.emit("searchresults", [])
        }
    })
    socket.on("find", async (msg) => {
        if(!authed){
            socket.emit("message", {"type": "auth", "success": false, "error": "Invalid authtoken", "authorized": false})
            return
        }
        if(typeof(msg) == "string"){
            msg = JSON.parse(msg);
        }
        if(msg.source == "spotify"){
            var found = [];
            msg.selected.forEach(async (x) => {
              console.log(`Found: ${x.type} ${x.id}`);
              var result = {};
              var url = `https://open.spotify.com/${(x.type == "song") ? "track" : x.type}/${x.id}`;
              switch(x.type){
                case "song":
                  console.log("Getting song: "+url);
                  var track = await SpottyDL.getTrack(url);
                  result = {
                    title: track.album,
                    album: track.album,
                    artist: track.artist,
                    albumCoverURL: track.albumCoverURL,
                    songs: [{
                      title: track.title,
                      id: track.id,
                      trackNumber: track.trackNumber
                    }],
                  }
                  result.type = "song";
                  break;
                case "album":
                  console.log("Getting album: "+url);
                  result = await SpottyDL.getAlbum(url);
                  // if(typeof(result.playlistVideoRenderer) != "undefined") delete result.playlistVideoRenderer  //doesn't seem to do anything, probably a bug in the library
                  result.type = "album";
                  result.songs = result.tracks;
                  delete result.tracks
                  break;
                case "playlist":
                  result = await SpottyDL.getPlaylist(url);
                  result.type = "playlist";
                  result.songs = result.tracks;
                  delete result.tracks;
                  break;
                default:
                  console.log(`${x.type} Not implemented`);
              }
              found.push(result);
            });
            await waitUntil(() => {return found.length == msg.selected.length}, {timeout: Number.POSITIVE_INFINITY});
            found = found.map((x) => ({
              name: typeof(x.title) == "string" ? x.title : typeof(x.name) == "string" ? x.name : "",
              album: typeof(x.album) == "string" ? x.album : "",
              artist: typeof(x.artist) == "string" ? x.artist : "",
              imageUrl: typeof(x.albumCoverURL) == "string" ? x.albumCoverURL : typeof(x.playlistCoverURL) == "string" ? x.playlistCoverURL : "",
              type: x.type,
              songs: x.songs
            }));
            console.log(`Sending ${found.length} results.`);
            socket.emit("findresults", {"results": found});
        }
        else if(msg.source == "youtube"){
            socket.emit("message", {"type": "auth", "success": false, "error": "Not implemented", "authorized": true}) // Not implemented
            return
        }
    });
    
    socket.on("add", async (msg) => {
        if(!authed){
            socket.emit("message", {"type": "auth", "success": false, "error": "Invalid authtoken", "authorized": false})
            return
        }
        if(typeof(msg) == "string"){
            msg = JSON.parse(msg);
        }
        var artists = [];
        var artistKeys = [];
        var albums = [];
        var albumKeys = [];
        var songs = [];
        var iterated = 0;
        msg.items.forEach(async (x) => {
          console.log("artist: "+JSON.stringify(artistKeys, null, 2));
          console.log("album: "+JSON.stringify(albumKeys, null, 2));
          console.log("");
          switch(x.type){
            case "song":
              var artistKey = hash(x.artist);
              var albumKey = artistKey + "_" + hash(x.name);
              console.log(x.songs[0]["title"]);
              songs.push({
                id: albumKey + "_" + hash(x.songs[0].id),
                albumId: albumKey,
                artistId: artistKey,
                displayName: x.songs[0].title,
                albumDisplayName: x.name,
                artistDisplayName: x.artist,
                duration: 0,
                youtubeId: x.songs[0].id,
                imageUrl: x.imageUrl,
                added: Date.now(),
              });
              if(albumKeys.indexOf(albumKey) == -1){
                albumKeys.push(albumKey);
                albums.push({
                  id: albumKey,
                  artistId: artistKey,
                  displayName: x.name,
                  artistDisplayName: x.artist,
                  songCount: 1,
                  imageUrl: x.imageUrl,
                  added: Date.now(),
                });
              }else{
                albums[albumKeys.indexOf(albumKey)].songCount++;
              }
              if(artistKeys.indexOf(artistKey) == -1){
                artistKeys.push(artistKey);
                artists.push({
                  id: artistKey,
                  displayName: x.artist,
                  songCount: 1,
                  albumCount: (albumKeys.indexOf(albumKey) == -1) ? 0 : 1,
                  imageUrl: "",
                  added: Date.now(),
                });
              }else{
                artists[artistKeys.indexOf(artistKey)].songCount++;
                artists[artistKeys.indexOf(artistKey)].albumCount = artists[artistKeys.indexOf(artistKey)].albumCount + (albumKeys.indexOf(albumKey) == -1 ? 1 : 0);
              }
              break;
            case "album":
              var artistKey = hash(x.artist);
              var albumKey = artistKey + "_" + hash(x.name);
              x.songs.forEach((y) => {
                songs.push({
                  id: albumKey + "_" + hash(y.id),
                  albumId: albumKey,
                  artistId: artistKey,
                  displayName: y.title,
                  albumDisplayName: x.name,
                  artistDisplayName: x.artist,
                  duration: 0,
                  youtubeId: y.id,
                  imageUrl: x.imageUrl,
                  added: Date.now(),
                });
              });
              if(albumKeys.indexOf(albumKey) == -1){
                albumKeys.push(albumKey);
                albums.push({
                  id: albumKey,
                  artistId: artistKey,
                  displayName: x.name,
                  artistDisplayName: x.artist,
                  songCount: x.songs.length,
                  imageUrl: x.imageUrl,
                  added: Date.now(),
                });
              }else{
                albums[albumKeys.indexOf(albumKey)].songCount += x.songs.length ;
              }
              if(artistKeys.indexOf(artistKey) == -1){
                artistKeys.push(artistKey);
                artists.push({
                  id: artistKey,
                  displayName: x.artist,
                  songCount: x.songs.length,
                  albumCount: (albumKeys.indexOf(albumKey) == -1) ? 0 : 1,
                  imageUrl: "",
                  added: Date.now(),
                });
              }else{
                artists[artistKeys.indexOf(artistKey)].songCount += x.songs.length;
                artists[artistKeys.indexOf(artistKey)].albumCount = artists[artistKeys.indexOf(artistKey)].albumCount + (albumKeys.indexOf(albumKey) == -1 ? 1 : 0);
              }
              break;
          }
          console.log("artist "+x.artist+": "+JSON.stringify(artistKeys, null, 2));
          console.log("album: "+JSON.stringify(albumKeys, null, 2));
          console.log("____________________________");
          iterated++;
        });
        await waitUntil(() => {return iterated == msg.items.length}, {timeout: Number.POSITIVE_INFINITY});
        console.log(`Adding ${songs.length} songs, ${albums.length} albums and ${artists.length} artists.`);
        iterated = 0;
        artists.forEach(async (x) => {
          if(x.imageUrl == ""){
            x.imageUrl = await getArtistImageUrl(x.displayName.split(",")[0], "https://commons.wikimedia.org/wiki/File:Apple_Music_Icon.svg");
          }
          iterated++;
        });
        await waitUntil(() => {return iterated == artists.length}, {timeout: Number.POSITIVE_INFINITY});
        await db.artists.bulkInsert(artists);
        await db.albums.bulkInsert(albums);
        await db.songs.bulkInsert(songs);
        console.log("Finished adding songs, albums and artists.");
        socket.emit("addresult", {"success": true, "count": {"artists": artists.length, "albums": albums.length, "songs": songs.length}});
    });
})

async function main(){
    await checkDirs()
    console.log("Checked and ready to start")
    server.listen(port, () => {
        console.log(`App listening on port ${port}`)
    })
}

try{
    main()
}catch (e){
    console.log("Error: "+e)
}


// This is just all the random
// functions that I need to move
// to seperate files but haven't
// yet because modules and requiring
// is annoying so I probably
// won't move them anytime soon

async function getArtistImageUrl(name, backupImageUrl){
  console.log("Getting image for "+name)
  const { stdout, stderr } = await exec('python3 find_artist_profile_url.py "'+name+'"')
  var data = {}
  console.log(stdout)
  try{
    data = JSON.parse(stdout)
            
    if(data["success"]){
      return data["url"];
    }
    if(!data["success"]){
      return backupImageUrl
    }
  }catch (err){
    console.log(err)
    return backupImageUrl
  }
}

async function extractSongImage(file, dest){
    if(!(fs.existsSync(dest))){
        console.log("File doesn't exist, creating...");
        var v = await new Promise((resolve, reject) => {
            new jsmt.Reader(path.join(__dirname, file))
              .read({
                onSuccess: (tag) => {
                  console.log('Success!');
                  resolve(tag);
                },
                onError: (error) => {
                  console.log('Error extracting metadata:', error);
                  reject(error);
                }
            });
        })
        var resu = v
        if(typeof(resu.tags.picture) == "undefined"){
            console.log("No picture in metadata for "+file)
            // return
        }else{
            const { data, format } = resu.tags.picture;
            let base64String = "";
            for (var i = 0; i < data.length; i++) {
                base64String += String.fromCharCode(data[i]);
            }
            fs.writeFileSync(dest, Buffer.from(base64String, 'binary'), 'binary');    
            console.log("Done!")
        }
    }
}

async function inferSongImage(id){
    var albumid = "";
        //Get album id
        var song = await db.songs.findOne({selector: {"id": id}}).exec();
        albumid = song.albumId;
        song = await db.songs.findOne({
                selector: {
                    "albumId": albumid,
                    "id": {$ne: id}
                }
            }).exec();
        //Try to extract image
        await extractSongImage(song.file, path.join(__dirname, "config", "images", "songs", id+".png"));
}

async function extractAlbumImage(id, dest){
    var song = await db.songs.findOne({selector: {"albumId": id}}).exec();
    var file = song.file;
    await extractSongImage(file, (dest == undefined ? path.join(__dirname, "config", "images", "albums", id+".png") : dest));
}

function hash(string){
    return crypto.createHash('sha256').update(string).digest('hex');
}

async function withTimeout(promise, timeoutMs) {
    const timeoutPromise = new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error({"code": "ETIMEDOUT"}));
      }, timeoutMs);
    });
  
    try {
      return await Promise.race([promise, timeoutPromise]);
    } catch (err) {
      throw err; // Rethrow the error for the caller to handle
    }
}

async function checkAuth(token){
    if(typeof(token) == "undefined"){
        return Promise.resolve(false); 
    }else{
        const result = await db.auth.findOne({selector: {"authtoken": token}}).exec()
        return Promise.resolve(result != null);
    }
}

async function getUser(authtoken){
    var result = await db.auth.findOne({selector: {"authtoken": authtoken}}).exec()
    return (result == 0) ? "" : result.loginName
}

async function addToRecentlyPlayed(user, songId){
    console.log("Adding to recent: ",user, songId)
    var recent = await db.played.findOne({selector: {"owner": user}}).exec();
    var newRecent = {owner: user, songs: []};
    if(recent == null){
        console.log("Recent is null")
        newRecent = {owner: user, songs: [songId]}
    }else{
        newRecent.songs = recent.songs;
        if(recent.songs.length >= 10){
            console.log("Too long")
            newRecent.songs.splice(0, 1);
        }
        newRecent.songs.push(songId);
    }
    await db.played.upsert(newRecent);
}

async function downloadFile(fileUrl, outputLocationPath) {
    const writer = fs.createWriteStream(outputLocationPath);
  
    return axios({
      method: 'get',
      url: fileUrl,
      responseType: 'stream',
    }).then(response => {
  
      //ensure that the user can call `then()` only when the file has
      //been downloaded entirely.
  
      return new Promise((resolve, reject) => {
        response.data.pipe(writer);
        let error = null;
        writer.on('error', err => {
          error = err;
          writer.close();
          reject(err);
        });
        writer.on('close', () => {
          if (!error) {
            resolve(true);
          }
          //no need to call the reject here, as it will have been called in the
          //'error' stream;
        });
      });
    });
}

function getRandomInt(min, max) {
    return (Math.floor(Math.pow(10,14)*Math.random()*Math.random())%(max-min+1))+min;
}


// Update functions
// I should move 
// Them to seperate
// Files, but for
// now, who cares


async function checkDirs(){
    if(!fs.existsSync(path.join(__dirname, "config"))){
        fs.mkdirSync(path.join(__dirname, "config"));
    }
    if(!fs.existsSync(path.join(__dirname, "config", 'images'))){
        fs.mkdirSync(path.join(__dirname, "config", 'images'));
    }
    if(!fs.existsSync(path.join(__dirname, "config", 'images', 'albums'))){
        fs.mkdirSync(path.join(__dirname, "config", 'images', 'albums'));
    }
    if(!fs.existsSync(path.join(__dirname, "config", 'images', 'artists'))){
        fs.mkdirSync(path.join(__dirname, "config", 'images', 'artists'));
    }
    if(!fs.existsSync(path.join(__dirname, "config", 'images', 'songs'))){
        fs.mkdirSync(path.join(__dirname, "config", 'images', 'songs'));
    }
    if(!fs.existsSync(path.join(__dirname, 'music'))){
        fs.mkdirSync(path.join(__dirname, 'music'));
    }
}
