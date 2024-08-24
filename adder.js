//Just some crazy stuff I found in a Stack Overflow
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const path = require('path');
import {fileURLToPath} from 'url';
const __filename = fileURLToPath(import.meta.url);

import utils from "./utils.js";

const SpottyDL = require('spottydl-better');
const { SpotifyApi } = require("@spotify/web-api-ts-sdk");
const clientID = "0a65ebdec6ec4983870a7d2f51af2aa1";
const secretKey = "22714014e04f46cebad7e03764beeac8";
const { waitUntil } = require('async-wait-until');

function adderConnection(socket, db, ts){
    console.log('a user connected');
    socket.emit("authprompt", "3141592653589793238464")
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
    var authed = false
    var user = "";
    socket.on("auth", async (msg) => {
        if(typeof(msg) == "string"){
            msg = JSON.parse(msg);
        }
        var aut = await utils.checkAuth(msg.authtoken, db);
        console.log(aut, msg.authtoken, typeof(msg));
        if(!aut){
            socket.emit("authresult", {"success": false, "error": "Invalid authtoken", "authorized": false})
            return
        }
        socket.emit("authresult", {"success": true, "authorized": true})
        user = await utils.getUser(msg.authtoken, db);
        console.log("Allowing", user, "to add songs");
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
                  console.log("Got track: "+track.title);
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
        var addedArtists = 0;
        var addedAlbums = 0;
        var addedSongs = 0;
        songs = await db.songs.find().exec();
        artists = await db.artists.find().exec();
        albums = await db.albums.find().exec();
        artistKeys = artists.map((e) => e.id);
        albumKeys = albums.map((e) => e.id);
        //songs = songs.map((e) => ({
        //  id: e.id,
        //  albumId: e.albumId,
        //  artistId: e.artistId,
        //  displayName: e.displayName,
        //  albumDisplayName: e.albumDisplayName,
        //  artistDisplayName: e.artistDisplayName,
        //  duration: e.duration,
        //  youtubeId: e.youtubeId,
        //  imageUrl: e.imageUrl,
        //  added: e.added,
        //}))
        //albums = albums.map((e) => ({
        //  id: e.id,
        //  artistId: e.artistId,
        //  displayName: e.displayName,
        //  artistDisplayName: e.artistDisplayName,
        //  songCount: e.songCount == null || e.songCount !== e.songCount ? 0 : e.songCount,
        //  imageUrl: e.imageUrl,
        //  added: e.added,
        //}));
        //artists = artists.map((e) => ({
        //  id: e.id,
        //  displayName: e.displayName,
        //  albumCount: e.albumCount == null || e.albumCount !== e.albumCount ? 0 : e.albumCount,
        //  songCount: e.songCount == null || e.songCount !== e.songCount ? 0 : e.songCount,
        //  imageUrl: e.imageUrl,
        //  added: e.added,
        //}))
        msg.items.forEach(async (x) => {
          //console.log("artist: "+JSON.stringify(artistKeys, null, 2));
          //console.log("album: "+JSON.stringify(albumKeys, null, 2));
          //console.log("");
          var artist = (x.type == "song" || x.type == "album") ? x.artist.split(",")[0] : "";
          switch(x.type){
            case "song":
              var artistKey = utils.hash(artist);
              var albumKey = artistKey + "_" + utils.hash(x.name);
              console.log(x.songs[0]["title"]);
              songs.push({
                id: albumKey + "_" + utils.hash(x.songs[0].id),
                albumId: albumKey,
                artistId: artistKey,
                displayName: x.songs[0].title,
                albumDisplayName: x.name,
                artistDisplayName: artist,
                duration: 0,
                youtubeId: x.songs[0].id,
                imageUrl: x.imageUrl,
                added: Date.now(),
                visibleTo: ["all"],
                addedBy: user,
              });
              addedSongs++;
              if(albumKeys.indexOf(albumKey) == -1){
                albumKeys.push(albumKey);
                albums.push({
                  id: albumKey,
                  artistId: artistKey,
                  displayName: x.name,
                  artistDisplayName: artist,
                  songCount: 1,
                  imageUrl: x.imageUrl,
                  added: Date.now(),
                  visibleTo: ["all"],
                  addedBy: user,
                });
                addedAlbums++;
              }else{
                albums[albumKeys.indexOf(albumKey)].songCount++;
              }
              if(artistKeys.indexOf(artistKey) == -1){
                artistKeys.push(artistKey);
                artists.push({
                  id: artistKey,
                  displayName: artist,
                  songCount: 1,
                  albumCount: (albumKeys.indexOf(albumKey) == -1) ? 0 : 1,
                  imageUrl: "",
                  added: Date.now(),
                  visibleTo: ["all"],
                  addedBy: user,
                });
                addedArtists++;
              }else{
                artists[artistKeys.indexOf(artistKey)].songCount++;
                artists[artistKeys.indexOf(artistKey)].albumCount += (albumKeys.indexOf(albumKey) == -1 ? 1 : 0);
              }
              break;
            case "album":
              var artistKey = utils.hash(artist);
              var albumKey = artistKey + "_" + utils.hash(x.name);
              x.songs.forEach((y) => {
                songs.push({
                  id: albumKey + "_" + utils.hash(y.id),
                  albumId: albumKey,
                  artistId: artistKey,
                  displayName: y.title,
                  albumDisplayName: x.name,
                  artistDisplayName: artist,
                  duration: 0,
                  youtubeId: y.id,
                  imageUrl: x.imageUrl,
                  added: Date.now(),
                  visibleTo: ["all"],
                  addedBy: user,
                });
                addedSongs += x.songs.length;
              });
              if(albumKeys.indexOf(albumKey) == -1){
                albumKeys.push(albumKey);
                albums.push({
                  id: albumKey,
                  artistId: artistKey,
                  displayName: x.name,
                  artistDisplayName: artist,
                  songCount: x.songs.length,
                  imageUrl: x.imageUrl,
                  added: Date.now(),
                  visibleTo: ["all"],
                  addedBy: user,
                });
                addedAlbums++;
              }else{
                albums[albumKeys.indexOf(albumKey)].songCount += x.songs.length;
              }
              if(artistKeys.indexOf(artistKey) == -1){
                artistKeys.push(artistKey);
                artists.push({
                  id: artistKey,
                  displayName: artist,
                  songCount: x.songs.length,
                  albumCount: (albumKeys.indexOf(albumKey) == -1) ? 0 : 1,
                  imageUrl: "",
                  added: Date.now(),
                  visibleTo: ["all"],
                  addedBy: user,
                });
                addedArtists++;
              }else{
                artists[artistKeys.indexOf(artistKey)].songCount += x.songs.length
                artists[artistKeys.indexOf(artistKey)].albumCount += (albumKeys.indexOf(albumKey) == -1 ? 1 : 0);
              }
              break;
          }
          // console.log("artist "+artist+": "+JSON.stringify(artistKeys, null, 2));
          // console.log("album: "+JSON.stringify(albumKeys, null, 2));
          console.log("____________________________");
          iterated++;
        });
        await waitUntil(() => {return iterated == msg.items.length}, {timeout: Number.POSITIVE_INFINITY});
        console.log(`Adding ${songs.length} songs, ${albums.length} albums and ${artists.length} artists.`);
        iterated = 0;
        artists.forEach(async (x) => {
          if(x.imageUrl == ""){
            x.imageUrl = await utils.getArtistImageUrl(x.displayName.split(",")[0], "https://commons.wikimedia.org/wiki/File:Apple_Music_Icon.svg");
          }
          iterated++;
        });
        await waitUntil(() => {return iterated == artists.length}, {timeout: Number.POSITIVE_INFINITY});
        // var json = JSON.stringify({"songs": songs, "albums": albums, "artists": artists});
        // fs.writeFileSync("data.json", json);
        albums.forEach((e)=>{
          console.log("Songcount for", e.displayName, e.songCount, typeof e.songCount);
        });
        artists.forEach((e)=>{
          console.log("Songcount for", e.displayName, e.songCount, typeof e.songCount);
          console.log("Albumcount for", e.displayName, e.albumCount, typeof e.albumCount);
        })
        await db.artists.bulkUpsert(artists);
        await db.albums.bulkUpsert(albums);
        await db.songs.bulkUpsert(songs);
        await ts.updateSongs(songs);
        await ts.updateAlbums(albums);
        await ts.updateArtists(artists);
        console.log("Finished adding songs, albums and artists.");
        socket.emit("addresult", {"success": true, "count": {"artists": addedArtists, "albums": addedAlbums, "songs": addedSongs}});
    });
}

export default adderConnection;
