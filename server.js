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
const http = require('http');
const { Server } = require("socket.io");

import crypto from 'crypto';

import db from './db.js';
import ts from './typesense_module.js';
import adderConnection from './adder.js';
import utils from './utils.js';
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

// app.use('/',express.static(path.join(__dirname, 'static')));

app.post('/latestCommit', async function (_, res) {
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

app.post('/status', function (_, res) {
    res.send({"status": "ok"})
})

app.get('/status', function (_, res) {
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

app.get('/placeholder', function (req, res) {
    res.sendFile(path.join(__dirname, "config", 'images', 'placeholder.jpg'));
})

app.post('/info/albums', async function (req, res) {
    if((await utils.checkAuth(req.body.authtoken, db)) == false){
        res.send({"authed": false, "albums": []});
        return
    }

    const data = await db.albums.find({sort: [{artistId: "asc"}, {added: "asc"}]}).exec();
   res.send({"authed": true, "albums": data});
});

app.post('/info/artists', async function (req, res) {
    if((await utils.checkAuth(req.body.authtoken, db)) == false){
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
    if((await utils.checkAuth(req.body.authtoken, db)) == false){
        res.send({"authed": false, "songs": []});
        return
    }
    var data = [];
    if(typeof(req.query.limit) == "int" || typeof req.query.limit == "string"){
      data = await db.songs.find({sort: [{"added": "desc"}], limit: parseInt(req.query.limit)}).exec();
    }else{
      data = await db.songs.find({sort: [{"added": "desc"}]}).exec();
    }
    // console.log(data[0]);
    res.send({"authed": true, "songs": data});
});

app.post('/info/artist/:id', async function (req, res) {
  if((await utils.checkAuth(req.body.authtoken, db)) == false){
    res.send({"authed": false, "artist": {}});
    return;
  }

  const data = await db.artists.findOne({selector: {id: req.params.id}}).exec();
  res.send({"authed": true, "artist": data});
});

app.post('/info/album/:id', async function (req, res) {
  if((await utils.checkAuth(req.body.authtoken, db)) == false){
    res.send({"authed": false, "album": {}});
    return
  }
  
  const data = await db.albums.findOne({selector: {id: req.params.id}}).exec();
  res.send({"authed": true, "album": data});
});

app.post('/info/albums/by/artist/:id', async function (req, res) {
  if((await utils.checkAuth(req.body.authtoken, db)) == false){
    res.send({"authed": false, "albums": []});
    return;
  }

  var albumsData = [];
  if(req.query.excludeSingles == "true"){
    const data = await db.albums.find({selector: {artistId: req.params.id, songCount: 1}, sort: [{added: "desc"}]}).exec();
    var excludeIds = data.map(a => a.id);
    console.log(data.map(a => a.id));
    var abD = await db.albums.find(
      {
        selector: {artistId: req.params.id},
        sort: [
          {added: "desc"}
        ]
      }
    ).exec();
    albumsData = abD.filter(a => !excludeIds.includes(a.id));
  }else{
    albumsData = await db.albums.find(
      {
        selector: {artistId: req.params.id},
        sort: [
          {added: "desc"}
        ]
      }
    ).exec();
  }
  res.send({"authed": true, "albums": albumsData});
});

app.post('/info/singles/by/artist/:id', async function (req, res) {
  if((await utils.checkAuth(req.body.authtoken, db)) == false){
    res.send({"authed": false, "songs": []});
    return;
  }

  const data = await db.albums.find({selector: {artistId: req.params.id, songCount: 1}, sort: [{added: "desc"}]}).exec();
  const songsData = await db.songs.find({
    selector: {
      albumId: {$in: data.map(a => a.id)},
    },
    sort: [{"added": "desc"}],
  }).exec();
  res.send({"authed": true, "songs": songsData});
});

app.post('/info/songs/by/album/:id', async function (req, res) {
    if((await utils.checkAuth(req.body.authtoken, db)) == false){
        res.send({"authed": false, "songs": []});
        return
    }

    const data = await db.songs.find({selector: {albumId: req.params.id}, sort: [{"trackNumber": "asc"}]}).exec();
    res.send({"authed": true, "songs": data});
});

app.post('/info/songs/by/artist/:id', async function (req, res) {
    if((await utils.checkAuth(req.body.authtoken, db)) == false){
        res.send({"authed": false, "songs": []});
        return
    }

    const data = await db.songs.find({selector: {artistId: req.params.id}, sort: [{"artistId": "asc"}, {"albumId": "asc"}]}).exec();
    res.send({"authed": true, "songs": data});
});

app.post('/info/songs/batch', async function (req, res) {
    if((await utils.checkAuth(req.body.authtoken, db)) == false){
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
    if((await utils.checkAuth(req.body.authtoken, db)) == false){
        res.send({"authed": false, "songs": []});
        return
    }

    const result = await db.songs.findOne({selector: {"id": req.params.id}}).exec();
    res.send({"authed": true, "song": (result) ? result : {} }); 
});

app.post('/playlists', async function(req, res){
    if((await utils.checkAuth(req.body.authtoken, db)) == false){
        res.send({"authed": false, "playlists": []});
        return
    }

    var u = await utils.getUser(req.body.authtoken, db);
    var playlists = [];
    if(req.query.sort == "new"){
      playlists = await db.playlists.find({selector: {$or: [{owner: u}, {public: true}]}, sort: [{added: "desc"}]}).exec();
    }else{
      playlists = await db.playlists.find({selector: {$or: [{owner: u}, {public: true}]}}).exec();
    }
    res.send({"authed": true, "playlists": playlists})
})

app.post('/playlists/user/:id', async function(req, res){
    if((await utils.checkAuth(req.body.authtoken, db)) == false){
        res.send({"authed": false, "playlists": []});
        return
    }
    var u = await utils.getUser(req.body.authtoken, db);
    if(u != req.params.id){
        // res.send({authed: false, "error": "Not authorized", "success": false})
        // return
    }

    var d = await db.playlists.find({selector: {owner: req.params.id}}).exec();
    res.send({"authed": true, "playlists": d});
})

app.post('/playlists/:id', async function(req, res){
    if((await utils.checkAuth(req.body.authtoken, db)) == false){
        res.send({"authed": false, "playlists": []});
        return
    }
    var u = await utils.getUser(req.body.authtoken, db);
    if(u != req.params.id){
        // res.send({authed: false, "error": "Not authorized", "success": false})
        // return
    }

    var d = await db.playlists.find({selector: {id: req.params.id}}).exec();
    res.send({"authed": true, "playlists": d});
})

app.post('/playlists/modify/:playlist', async function(req, res){
    if((await utils.checkAuth(req.body.authtoken, db)) == false){
        res.send({"authed": false});
        return
    }
    var u = await utils.getUser(req.body.authtoken, db);
    if(req.params.playlist == "create"){
      console.log("Creating new playlist")
      p = await db.playlists.upsert({
        id: hash(req.body.name),
        owner: u || "testguy",
        displayName: req.body.name || "Banana",
        description: req.body.description || "Banana",
        public: req.body.public == "true" || false,
        songs: req.body.songs || [],
        added: Date.now(),
      });
      res.send({authed: true, "playlist": p, "success": true})
      return
    }
    var p = await db.playlists.findOne({selector: {id: req.params.playlist}}).exec();
    if(p == null){
        console.log("Playlist does not exist. Creating new playlist.")
        
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
    if((await utils.checkAuth(req.body.authtoken), db) == false){
        res.send({"authed": false, "songs": []});
        return
    }
    var u = await utils.getUser(req.body.authtoken, db);
    var p = await db.playlists.findOne({selector: {id: req.params.playlist}}).exec();
    if(p == null){
        res.send({authed: true, "success": true, "playlists": await db.playlists.find({selector: {$or: [{owner: u}, {public: true}]}}).exec()});
        return;
    }
    if(u != p.owner && u != "testguy"){
        res.send({authed: false, "error": "Not authorized", "success": false})
        return
    }
    await p.remove();
    res.send({authed: true, "success": true, "playlists": await db.playlists.find({selector: {$or: [{owner: u}, {public: true}]}}).exec()});
})

app.post('/recently-played/:user/add', async function(req, res){
    if((await utils.checkAuth(req.body.authtoken, db)) == false){
        res.send({"authed": false, "success": false})
        return
    }
    var u = await utils.getUser(req.body.authtoken, db);
    var user = req.params.user;
    console.log(user, "r==a", u);
    if(user != u){
        res.send({"error": "Unauthorized", "authed": true, "success": false})
        return
    }
    await utils.addToRecentlyPlayed(user, req.body.id, db);
    res.send({"authed": true, "success": true})
})

app.post('/recently-played/:user', async function(req, res){
    if((await utils.checkAuth(req.body.authtoken, db)) == false){
        res.send({"authed": false, played: []});
        return
    }
    var played = await db.played.findOne({selector: {owner: req.params.user}}).exec();
    if(played == null){
      res.send({"played": [], "authed": true, "success": true})
      return
    }
    res.send({"played": played.songs.filter(n => n).filter(n => n != "idklol") || [], "authed": true, "success": true})
});

app.post('/favorites/:user', async function(req, res){
    if((await utils.checkAuth(req.body.authtoken, db)) == false){
        res.send({"authed": false, songs: []});
        return
    }
    var favorite = await db.favorites.findOne({selector: {owner: user}}).exec();
    if(favorite == null){
        favorite = {owner: user, songs: [], count: 0}
        await db.favorites.upsert(favorite)
    }
    res.send({"songs": favorite.songs || [], "count": favorite.songs.length, "authed": true, "success": true})
})

app.post('/search', async function(req, res){
  var allowedSearchTypes = [
    "song",
    "album",
    "artist",
  ]
  var type = req.body.type
  if(type == null || !allowedSearchTypes.includes(type)){
    res.send({"authed": true, "error": "Invalid search type"})
    return
  }else if(req.body.query == ""){
    res.send({"authed": true, "type": type, "results": []});
    return
  }

  if((await utils.checkAuth(req.body.authtoken, db)) == false){
    res.send({"authed": false, "error": "Invalid authtoken", results: []});
    return;
  }
  
  var data = [];
  switch(type){
    case "song":
      data = await ts.searchSong(req.body.query);
      break;
    case "album":
      data = await ts.searchAlbum(req.body.query);
      break;
    case "artist":
      data = await ts.searchArtist(req.body.query);
      break;
  }
  res.send({"authed": true, "type": type, "results": data});
})


app.post('/searchAll', async function(req, res){
  if(req.body.query == ""){
    res.send({"authed": true, "results": []});
    return
  }

  if((await utils.checkAuth(req.body.authtoken, db)) == false){
    res.send({"authed": false, "error": "Invalid authtoken", results: []});
    return;
  }
  
  var songs = await ts.searchSong(req.body.query);
  var albums = await ts.searchAlbum(req.body.query);
  var artists = await ts.searchArtist(req.body.query);
  var relevancy = await ts.relevancy(req.body.query);
  var firstArtist = -1;
  var firstAlbum = -1;
  var firstSong = -1;
  relevancy = relevancy.filter((r, i) => {
    if(r.type == "artist" && firstArtist == -1) firstArtist = i
    if(r.type == "album" && firstAlbum == -1) firstAlbum = i
    if(r.type == "song" && firstSong == -1) firstSong = i
    if(r.type == "artist" && firstArtist != i) return undefined
    if(r.type == "album" && firstAlbum != i) return undefined
    if(r.type == "song" && firstSong != i) return undefined
    return r 
  }).map(r => r.type)
  console.log("relevancy", relevancy.length)
  if(!relevancy.includes("song")) relevancy.push("song")
  if(!relevancy.includes("album")) relevancy.push("album")
  if(!relevancy.includes("artist")) relevancy.push("artist")
  console.log("relevancy2", relevancy.length)
  var singles = []
  // var singles = albums.filter(r => r.songCount = 1)
  // albums  = albums.filter(r => r.songCount > 1)

  songs.map(r => r.type = "song")
  singles.map(r => r.type = "song")
  albums.map(r => r.type = "album")
  artists.map(r => r.type = "artist")
    
  res.send({"authed": true, "relevancy": relevancy, "songs": songs, "singles": singles, "albums": albums, "artists": artists});
});

app.post('/checklist', async function(req, res){
  if((await utils.checkAuth(req.body.authtoken, db)) == false){
    res.send({"authed": false, "error": "Invalid authtoken", todo: []});
    return;
  }

  var todo = await db.checklist.find().exec();
  res.send({"authed": true, "todos": todo});
  console.log("sent todos", todo.length)
});

app.post('/checklist/add', async function(req, res){
  if((await utils.checkAuth(req.body.authtoken, db)) == false){
    res.send({"authed": false, "error": "Invalid authtoken", "success": false});
    return;
  }

  var todo = {
    id: (await db.checklist.find().exec()).length+1,
    name: req.body.name,
    requestedBy: req.body.requestedBy,
    description: req.body.description || "No description",
    completed: false,
  }
  await db.checklist.upsert(todo)
  res.send({"authed": true, "todo": todo, "success": true});
})

app.post('/bugs', async function(req, res){
  if((await utils.checkAuth(req.body.authtoken, db)) == false){
    res.send({"authed": false, "error": "Invalid authtoken", bugs: []});
    return;
  }

  var bugs = await db.bugs.find().exec();
  res.send({"authed": true, "bugs": bugs});
});

io.on('connection', (socket) => {
  adderConnection(socket, db, ts);
});

async function main(){
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
