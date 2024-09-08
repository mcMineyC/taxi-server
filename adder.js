//Just some crazy stuff I found in a Stack Overflow
import { createRequire } from "module";
const require = createRequire(import.meta.url);

import utils from "./utils.js";

const SpottyDL = require('spottydl-better');
const clientID = "0a65ebdec6ec4983870a7d2f51af2aa1";
const secretKey = "22714014e04f46cebad7e03764beeac8";
const { waitUntil } = require('async-wait-until');

import YTMusic from "ytmusic-api";

const yt = new YTMusic()
await yt.initialize()

function adderConnection(socket, db, ts, spotifyApi){
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
            var page = 0
            if(typeof(msg.page) == "number"){
                page = msg.page
            }
            var items = []
            if(msg.mediaType == "all"){
                const trackItems = await spotifyApi.search(msg.query, "track", undefined, 50, page);
                items = trackItems.tracks.items
            }else{
                items = await spotifyApi.search(msg.query, msg.mediaType, undefined, 50, page);
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
                  var track = await spotifyApi.tracks.get(x.id);
                  var youtubeInfo = await yt.searchSongs(`${track.name} ${track.artists[0].name}`);
                  console.log("Got track: "+track.name);
                  result = {
                    title: track.album.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
                    album: track.album.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
                    artist: track.artists[0].name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
                    albumCoverURL: track.album.images[0].url,
                    songs: [{
                      title: track.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
                      id: typeof(youtubeInfo[0].videoId) == "undefined" ? youtubeInfo[0].browseId : youtubeInfo[0].videoId || "",
                      trackNumber: track.track_number
                    }],
                  }
                  result.type = "song";
                  break;
                case "album":
                  console.log("Getting album: "+url);
                  var album = await spotifyApi.albums.get(x.id);
                  var youtubeInfo = await yt.searchAlbums(`${album.name} ${album.artists[0].name}`);
                  console.log(JSON.stringify(youtubeInfo, null, 2));
                  if(youtubeInfo.length == 0) return;
                  var youtubeAlbum = await yt.getAlbum(youtubeInfo[0].albumId);
                  console.log(JSON.stringify(youtubeInfo, null, 2));
                  console.log("Got album: "+youtubeAlbum.name);
                  console.log(JSON.stringify(youtubeAlbum, null, 2));
                  result = ({
                    title: album.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
                    album: album.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
                    artist: album.artists[0].name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
                    albumCoverURL: album.images[0].url,
                    songs: youtubeAlbum.songs.map((x, index) => ({
                      title: x.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
                      id: typeof(x.videoId) == "undefined" ? x.browseId : x.videoId,
                      trackNumber: index
                    })),
                  });
                  result.type = "album";
                  break;
                case "playlist":
                  //result = await SpottyDL.getPlaylist(url);
                  //result.type = "playlist";
                  //result.songs = result.tracks;
                  //delete result.tracks;
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
            console.log(JSON.stringify(found, null, 0));
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
      console.log("Into add message")
        if(typeof(msg) == "string"){
            msg = JSON.parse(msg);
        }
        var artists = [];
        var artistKeys = [];
        var albums = [];
        var albumKeys = [];
        var songs = [];
        var songKeys = [];
        var iterated = 0;
        var addedArtists = 0;
        var addedAlbums = 0;
        var addedSongs = 0;
        songs = await db.songs.find().exec();
        artists = await db.artists.find().exec();
        albums = await db.albums.find().exec();
        artistKeys = artists.map((e) => e.id);
        albumKeys = albums.map((e) => e.id);
        songKeys = songs.map((e) => e.id);
        songs = JSON.parse(JSON.stringify(songs));
        artists = JSON.parse(JSON.stringify(artists));
        albums = JSON.parse(JSON.stringify(albums));
        var modifiedSongs = {};
        var modifiedAlbums = {};
        var modifiedArtists = {};
        msg.items.forEach((x) => {
          var oldSongsSet = new Set(songs.map((i) => i.id));
          var artist = (x.type == "song" || x.type == "album") ? x.artist.split(",")[0] : "";
          switch(x.type){
            case "song":
              var artistKey = utils.hash(artist);
              var albumKey = artistKey + "_" + utils.hash(x.name);
              var songKey = albumKey + "_" + utils.hash(x.songs[0].title);
              var newSong = false;
              if(songKeys.indexOf(songKey) != -1 && modifiedSongs[songKey] == undefined){
                modifiedSongs[songKey] = songs[songKeys.indexOf(songKey)];
                console.log("song didn't exist in array")
              }
              if(modifiedSongs[songKey] == undefined){
                newSong = true;
              }
              if(albumKeys.indexOf(albumKey) != -1 && modifiedAlbums[albumKey] == undefined){
                modifiedAlbums[albumKey] = albums[albumKeys.indexOf(albumKey)];
                console.log("album didn't exist in array")
              }
              if(artistKeys.indexOf(artistKey) != -1 && modifiedArtists[artistKey] == undefined){
                modifiedArtists[artistKey] = artists[artistKeys.indexOf(artistKey)];
                console.log("artist didn't exist in array")
              }
              var newAlbum = false;
              if(modifiedAlbums[albumKey] == undefined){
                modifiedAlbums[albumKey] = {
                  id: albumKey,
                  artistId: artistKey,
                  displayName: x.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
                  artistDisplayName: artist.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
                  songCount: 1,
                  imageUrl: x.imageUrl,
                  added: Date.now(),
                  visibleTo: ["all"],
                  addedBy: user,
                };
                newAlbum = true;
                addedAlbums++;
              }else{
                if(newSong) modifiedAlbums[albumKey].songCount++;
              }
              if(modifiedArtists[artistKey] == undefined){
                modifiedArtists[artistKey] = {
                  id: artistKey,
                  displayName: artist.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
                  songCount: 1,
                  albumCount: newAlbum ? 1 : -1,
                  imageUrl: "",
                  added: Date.now(),
                  visibleTo: ["all"],
                  addedBy: user,
                };
                addedArtists++;
              }else{
                if(newSong) modifiedArtists[artistKey].songCount++;
                if(newAlbum) modifiedArtists[artistKey].albumCount++;
              }
              modifiedSongs[songKey] = {
                id: songKey,
                albumId: albumKey,
                artistId: artistKey,
                displayName: x.songs[0].title.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
                albumDisplayName: x.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
                artistDisplayName: artist.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
                duration: 0,
                youtubeId: x.songs[0].id,
                imageUrl: x.imageUrl,
                added: Date.now(),
                visibleTo: ["all"],
                addedBy: user,
              };
              if(newSong) addedSongs++;
              break;
            case "album":
              var artistKey = utils.hash(artist);
              var albumKey = artistKey + "_" + utils.hash(x.name);
              if(albumKeys.indexOf(albumKey) != -1 && modifiedAlbums[albumKey] == undefined){
                modifiedAlbums[albumKey] = albums[albumKeys.indexOf(albumKey)];
                console.log("album didn't exist in array")
              }
              if(artistKeys.indexOf(artistKey) != -1 && modifiedArtists[artistKey] == undefined){
                modifiedArtists[artistKey] = artists[artistKeys.indexOf(artistKey)];
                console.log("artist didn't exist in array")
              }
              var newAlbum = false;
              var newSongCount = 0;
              x.songs.forEach((song) => {
                var songKey = albumKey + "_" + utils.hash(song.title);
                if(songKeys.indexOf(songKey) == -1) newSongCount++;
              });
              if(modifiedAlbums[albumKey] == undefined){
                modifiedAlbums[albumKey] = {
                  id: albumKey,
                  artistId: artistKey,
                  displayName: x.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
                  artistDisplayName: artist.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
                  songCount: newSongCount,
                  imageUrl: x.imageUrl,
                  added: Date.now(),
                  visibleTo: ["all"],
                  addedBy: user,
                };
                newAlbum = true;
                addedAlbums++;
              }else{
                if(newSong) modifiedAlbums[albumKey].songCount += newSongCount;
              }
              if(modifiedArtists[artistKey] == undefined){
                modifiedArtists[artistKey] = {
                  id: artistKey,
                  displayName: artist.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
                  songCount: newSongCount,
                  albumCount: newAlbum ? 1 : -1,
                  imageUrl: "",
                  added: Date.now(),
                  visibleTo: ["all"],
                  addedBy: user,
                };
                addedArtists++;
              }else{
                if(newAlbum) modifiedArtists[artistKey].albumCount++;
                modifiedArtists[artistKey].songCount += newSongCount;
              }
              console.log("Adding songs:", x.songs.length);
              x.songs.forEach((song) => {
                console.log(song.title);
                var songKey = albumKey + "_" + utils.hash(song.title);
                modifiedSongs[songKey] = {
                  id: songKey,
                  albumId: albumKey,
                  artistId: artistKey,
                  displayName: song.title.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
                  albumDisplayName: x.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
                  artistDisplayName: artist.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
                  duration: 0,
                  youtubeId: x.songs[0].id,
                  imageUrl: x.imageUrl,
                  added: Date.now(),
                  visibleTo: ["all"],
                  addedBy: user,
                };
              });
              addedSongs += newSongCount;
              break;
          }
          console.log("____________________________");
          //iterated++;
        });
        //await waitUntil(() => {return iterated == msg.items.length}, {timeout: Number.POSITIVE_INFINITY});
        console.log(`Adding ${songs.length} songs, ${albums.length} albums and ${artists.length} artists.`);
        iterated = 0;
        var modifiedSongsList = Object.values(modifiedSongs);
        var modifiedAlbumsList = Object.values(modifiedAlbums);
        var modifiedArtistsList = Object.values(modifiedArtists);
        modifiedArtistsList.forEach(async (x) => {
          if(x.imageUrl == ""){
            x.imageUrl = await utils.getArtistImageUrl(x.displayName.split(",")[0], "https://commons.wikimedia.org/wiki/File:Apple_Music_Icon.svg");
          }
          iterated++;
        });
        await waitUntil(() => {return iterated == modifiedArtistsList.length}, {timeout: Number.POSITIVE_INFINITY});
        console.log(JSON.stringify(modifiedArtists, null, 2));
        console.log("Albums")
        console.log(JSON.stringify(modifiedAlbums, null, 2));
        console.log("Songs")
        console.log(JSON.stringify(modifiedSongs, null, 2));
        // var json = JSON.stringify({"songs": songs, "albums": albums, "artists": artists});
        // fs.writeFileSync("data.json", json);
        //albums.forEach((e)=>{
        //  console.log("Songcount for", e.displayName, e.songCount, typeof e.songCount);
        //});
        //artists.forEach((e)=>{
        //  console.log("Songcount for", e.displayName, e.songCount, typeof e.songCount);
        //  console.log("Albumcount for", e.displayName, e.albumCount, typeof e.albumCount);
        //})
        console.log("DB upsert")
        await db.artists.bulkUpsert(modifiedArtistsList);
        await db.albums.bulkUpsert(modifiedAlbumsList);
        await db.songs.bulkUpsert(modifiedSongsList);
        console.log("Typesense update")
        await ts.updateSongs(modifiedSongsList);
        await ts.updateAlbums(modifiedAlbumsList);
        await ts.updateArtists(modifiedArtistsList);
        console.log("Finished adding songs, albums and artists.");
        socket.emit("addresult", {"success": true, "count": {"artists": addedArtists, "albums": addedAlbums, "songs": addedSongs}});
    });
}

export default {
  adderConnection: adderConnection,
  clientId: clientID,
  clientSecret: secretKey,
};
