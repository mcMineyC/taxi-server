// Just some crazy stuff I found in a Stack Overflow
import {createRequire} from "module";
const require = createRequire(import.meta.url);

import utils from "./utils.js";

const SpottyDL = require('spottydl-better');
const clientID = "0a65ebdec6ec4983870a7d2f51af2aa1";
const secretKey = "22714014e04f46cebad7e03764beeac8";
const {waitUntil} = require('async-wait-until');

import YTMusic from "ytmusic-api";

const yt = new YTMusic();
await yt.initialize();

function adderConnection(socket, db, ts, spotifyApi) {
  console.log('a user connected');
  socket.emit("authprompt", "3141592653589793238464")
  socket.on('disconnect', () => { console.log('user disconnected'); });
  var authed = false
  var user = "";
  socket.on("auth", async (msg) => {
    if (typeof (msg) == "string") {
      msg = JSON.parse(msg);
    }
    var aut = await utils.checkAuth(msg.authtoken, db);
    console.log(aut, msg.authtoken, typeof (msg));
    if (!aut) {
      socket.emit("authresult", {
        "success" : false,
        "error" : "Invalid authtoken",
        "authorized" : false
      })
      return
    }
    socket.emit("authresult", {"success" : true, "authorized" : true})
    user = await utils.getUser(msg.authtoken, db);
    console.log("Allowing", user, "to add songs");
    authed = true;
  })
  socket.on("search", async (msg) => {
    if (!authed) {
      socket.emit("message", {
        "type" : "auth",
        "success" : false,
        "error" : "Invalid authtoken",
        "authorized" : false
      })
      return
    }
    if (typeof (msg) == "string") {
      msg = JSON.parse(msg);
    }
    if (msg.source == "spotify") {
      if (msg.query == "") {
        socket.emit("message", {
          "type" : "error",
          "success" : false,
          "error" : "No query provided",
          "authorized" : true
        })
        return
      }
      var page = 0
      if (typeof (msg.page) == "number") {
        page = msg.page
      }
      var items = [];
      if (msg.mediaType == "all") {
        const trackItems =
            await spotifyApi.search(msg.query, "track", undefined, 50, page);
        items = trackItems.tracks.items
      } else {
        items = await spotifyApi.search(msg.query, msg.mediaType, undefined, 50,
                                        page);
        items = items[msg.mediaType + "s"].items
      }

      items = items.map(
          (item) => item.type == "track"
                        ? ({
                            id : typeof (item.id) == "string" ? item.id : "",
                            name : typeof (item.name) == "string" ? item.name
                                                                  : "",
                            artist : typeof (item.artists) == "object" &&
                                             typeof (item.artists[0].name) ==
                                                 "string"
                                         ? item.artists[0].name
                                         : "",
                            album : typeof (item.album) == "object" &&
                                            typeof (item.album.name) == "string"
                                        ? item.album.name
                                        : "",
                            imageUrl : typeof (item.album) == "object" &&
                                               item.album.images[0]
                                           ? (item.album.images
                                                  .sort((a, b) => b.width -
                                                                  a.width)[0]
                                                  .url)
                                           : "",
                            type : "song",
                          })
                        : (item.type == "album"
                               ? ({
                                   id : typeof (item.id) ==
                                                "string"
                                            ? item.id
                                            : "",
                                   name : typeof (item.name) ==
                                                  "string"
                                              ? item.name
                                              : "",
                                   album : "",
                                   artist :
                                       typeof (item.artists) ==
                                                   "object" &&
                                               typeof (item.artists[0].name) ==
                                                   "string"
                                           ? item.artists[0].name
                                           : "",
                                   imageUrl : typeof (item.images) ==
                                                          "object" &&
                                                      item.images[0]
                                                  ? item.images[0]
                                                        .url
                                                  : "",
                                   type : "album"
                                 })
                               : (item.type == "artist" ? ({
                                   id : typeof (item.id) == "string" ? item.id
                                                                     : "",
                                   name :
                                       typeof (item.name) == "string"
                                           ? item.name
                                           : "",
                                   album : "",
                                   artist : "",
                                   imageUrl :
                                       typeof (item.images) == "object" &&
                                               item.images[0]
                                           ? item.images[0].url
                                           : "",
                                   type : "artist",
                                 })
                                                        : item)));
      socket.emit("searchresults", {"type" : msg.mediaType, "results" : items})
    } else if (msg.source == "youtube") {
      socket.emit("searchresults", [])
    }
  })
  socket.on("find", async (msg) => {
    if (!authed) {
      socket.emit("message", {
        "type" : "auth",
        "success" : false,
        "error" : "Invalid authtoken",
        "authorized" : false
      })
      return
    }
    if (typeof (msg) == "string") {
      msg = JSON.parse(msg);
    }
    if (msg.source == "spotify") {
      var found = [];
      msg.selected.forEach(async (x) => {
        console.log(`Found: ${x.type} ${x.id}`);
        var result = {};
        var url = `https://open.spotify.com/${
            (x.type == "song") ? "track" : x.type}/${x.id}`;
        switch (x.type) {
        case "song":
          console.log("Getting song: " + url);
          var track = await spotifyApi.tracks.get(x.id);
          var youtubeInfo =
              await yt.searchSongs(`${track.name} ${track.artists[0].name}`);
          console.log("Got track: " + track.name);
          result = {
            title : track.album.name.normalize("NFD").replace(
                /[\u0300-\u036f]/g, ""),
            album : track.album.name.normalize("NFD").replace(
                /[\u0300-\u036f]/g, ""),
            artist : track.artists[0].name.normalize("NFD").replace(
                /[\u0300-\u036f]/g, ""),
            albumCoverURL : track.album.images[0].url,
            songs : [ {
              title :
                  track.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
              id : typeof (youtubeInfo[0].videoId) == "undefined"
                       ? youtubeInfo[0].browseId
                       : youtubeInfo[0].videoId || "",
              trackNumber : track.track_number
            } ],
          };
          result.type = "song";
          break;
        case "album":
          console.log("Getting album: " + url);
          var album = await spotifyApi.albums.get(x.id);
          var youtubeInfo =
              await yt.searchAlbums(`${album.name} ${album.artists[0].name}`);
          console.log(JSON.stringify(youtubeInfo, null, 2));
          if (youtubeInfo.length == 0)
            return;
          var youtubeAlbum = await yt.getAlbum(youtubeInfo[0].albumId);
          console.log(JSON.stringify(youtubeInfo, null, 2));
          console.log("Got album: " + youtubeAlbum.name);
          console.log(JSON.stringify(youtubeAlbum, null, 2));
          result = ({
            title : album.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
            album : album.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
            artist : album.artists[0].name.normalize("NFD").replace(
                /[\u0300-\u036f]/g, ""),
            albumCoverURL : album.images[0].url,
            songs : youtubeAlbum.songs.map(
                (x, index) => ({
                  title :
                      x.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
                  id : typeof (x.videoId) == "undefined" ? x.browseId
                                                         : x.videoId,
                  trackNumber : index
                })),
          });
          result.type = "album";
          break;
        case "playlist":
          // result = await SpottyDL.getPlaylist(url);
          // result.type = "playlist";
          // result.songs = result.tracks;
          // delete result.tracks;
          break;
        default:
          console.log(`${x.type} Not implemented`);
        }
        found.push(result);
      });
      await waitUntil(() => {return found.length == msg.selected.length},
                      {timeout : Number.POSITIVE_INFINITY});
      found = found.map(
          (x) => ({
            name : typeof (x.title) == "string"  ? x.title
                   : typeof (x.name) == "string" ? x.name
                                                 : "",
            album : typeof (x.album) == "string" ? x.album : "",
            artist : typeof (x.artist) == "string" ? x.artist : "",
            imageUrl : typeof (x.albumCoverURL) == "string" ? x.albumCoverURL
                       : typeof (x.playlistCoverURL) == "string"
                           ? x.playlistCoverURL
                           : "",
            type : x.type,
            songs : x.songs
          }));
      console.log(`Sending ${found.length} results.`);
      console.log(JSON.stringify(found, null, 0));
      socket.emit("findresults", {"results" : found});
    } else if (msg.source == "youtube") {
      socket.emit("message", {
        "type" : "auth",
        "success" : false,
        "error" : "Not implemented",
        "authorized" : true
      }) // Not implemented
      return
    }
  });

  socket.on("add", async (msg) => {
    if (!authed) {
      socket.emit("message", {
        "type" : "auth",
        "success" : false,
        "error" : "Invalid authtoken",
        "authorized" : false
      })
      return
    }
    console.log("Into add message")
    if (typeof (msg) == "string") {
      msg = JSON.parse(msg);
    }
    var artists = [];
    var albums = [];
    var songs = [];
    var addedArtists = 0;
    var addedAlbums = 0;
    var addedSongs = 0;
    songs = await db.songs.find().exec();
    artists = await db.artists.find().exec();
    albums = await db.albums.find().exec();
    songs = JSON.parse(JSON.stringify(songs));
    artists = JSON.parse(JSON.stringify(artists));
    albums = JSON.parse(JSON.stringify(albums));
    // Assuming that `flattenData` function already exists and returns flattened
    // arrays
    const {flattenedSongs, flattenedAlbums, flattenedArtists} =
        flattenData(msg.items);

    // Create dictionaries to track modified songs, albums, and artists
    const mergedOutput =
        adderMergeLogic(artists, albums, songs, msg.hierarchy, user);
    var modifiedArtists = mergedOutput.artists;
    var modifiedAlbums = mergedOutput.albums;
    var modifiedSongs = mergedOutput.songs;
    addedArtists = mergedOutput.artistCount;
    addedAlbums = mergedOutput.albumCount;
    addedSongs = mergedOutput.songCount;
    console.log("Adding", addedArtists, "artists,", addedAlbums, "albums,",
                addedSongs, "songs");

    // console.log(JSON.stringify(modifiedArtists, null, 2));
    // console.log("Albums")
    // console.log(JSON.stringify(modifiedAlbums, null, 2));
    // console.log("Songs")
    // console.log(JSON.stringify(modifiedSongs, null, 2));
    //  var json = JSON.stringify({"songs": songs, "albums": albums, "artists":
    //  artists}); fs.writeFileSync("data.json", json);
    //  albums.forEach((e)=>{
    //   console.log("Songcount for", e.displayName, e.songCount, typeof
    //   e.songCount);
    // });
    //  artists.forEach((e)=>{
    //   console.log("Songcount for", e.displayName, e.songCount, typeof
    //   e.songCount); console.log("Albumcount for", e.displayName,
    //   e.albumCount, typeof e.albumCount);
    // })
    // console.log("DB upsert");
    // await db.artists.bulkUpsert(modifiedArtists);
    // await db.albums.bulkUpsert(modifiedAlbums);
    // await db.songs.bulkUpsert(modifiedSongs);
    // console.log("Typesense update");
    // await ts.updateSongs(modifiedSongs);
    // await ts.updateAlbums(modifiedAlbums);
    // await ts.updateArtists(modifiedArtists);
    fs.writeFileSync('./backup/new_songs.json', JSON.stringify(songs, null, 2));
    fs.writeFileSync('./backup/new_albums.json',
                     JSON.stringify(albums, null, 2));
    fs.writeFileSync('./backup/new_artists.json',
                     JSON.stringify(artists, null, 2));

    console.log("Finished adding songs, albums and artists.");
    socket.emit("addresult", {
      "success" : true,
      "count" : {
        "artists" : addedArtists,
        "albums" : addedAlbums,
        "songs" : addedSongs
      }
    });
  });
}

async function adderMergeLogic(oldArtists, oldAlbums, oldSongs, hierearchyData,
                               user) {
  console.log("Into add message")
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
  artists = oldArtists;
  albums = oldAlbums;
  songs = oldSongs;
  artistKeys = artists.map((e) => e.id);
  albumKeys = albums.map((e) => e.id);
  songKeys = songs.map((e) => e.id);
  // Assuming that `flattenData` function already exists and returns flattened
  // arrays
  const flattenedData = flattenData(hierearchyData);
  const flattenedSongs = flattenedData.songs;
  const flattenedAlbums = flattenedData.albums;
  const flattenedArtists = flattenedData.artists;
  console.log(flattenedArtists);

  // Create dictionaries to track modified songs, albums, and artists
  var modifiedSongs = {};
  var modifiedAlbums = {};
  var modifiedArtists = {};
  flattenedArtists.forEach((artistData) => {
    console.log(artistData);
    const artistKey = utils.hash(artistData.name);
    if (artistKeys.includes(artistKey)) {
      console.log("artistKey already exists");
      modifiedArtists[artistKey] = artists[artistKeys.indexOf(artistKey)];
      return;
    }
    modifiedArtists[artistData.id] = {
      id : artistData.id,
      displayName :
          artistData.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
      imageUrl : artistData.imageUrl,
      added : Date.now(),
      visibleTo : artistData.visibleTo,
      addedBy : user,
      songCount : 0,
      albumCount : 0,
    };
    artistKeys.push(artistKey);
    addedArtists++;
  });
  flattenedAlbums.forEach((albumData) => {
    const artistKey = utils.hash(albumData.artist);
    const albumKey = artistKey + "_" + utils.hash(albumData.name);
    if (albumKeys.includes(albumKey)) {
      modifiedAlbums[albumKey] = albums[albumKeys.indexOf(albumKey)];
      return;
    }
    modifiedAlbums[albumKey] = {
      id : albumKey,
      artistId : artistKey,
      displayName : albumData.albumDisplayName.normalize("NFD").replace(
          /[\u0300-\u036f]/g, ""),
      artistDisplayName : albumData.artistDisplayName.normalize("NFD").replace(
          /[\u0300-\u036f]/g, ""),
      songCount : 0,
      imageUrl : albumData.imageUrl,
      added : Date.now(),
      visibleTo : albumData.visibleTo,
      addedBy : user,
    };
    albumKeys.push(albumKey);
    addedAlbums++;
    modifiedArtists[artistKey].albumCount++;
  });

  flattenedSongs.forEach((songData) => {
    console.log(songData);
    const artistKey = utils.hash(songData.artist);
    const albumKey = artistKey + "_" + utils.hash(songData.album);
    const songKey = albumKey + "_" +
                    utils.hash(songData.name.normalize("NFD").replace(
                        /[\u0300-\u036f]/g, ""));
    modifiedSongs[songKey] = {
      id : songKey,
      albumId : albumKey,
      artistId : artistKey,
      displayName :
          songData.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
      albumDisplayName :
          songData.album.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
      artistDisplayName :
          songData.artist.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
      duration : 0,
      youtubeId : songData.videoId,
      imageUrl : songData.imageUrl,
      added : Date.now(),
      visibleTo : songData.visibleTo,
      addedBy : user,
    };
    if (!songKeys.includes(songKey)) {
      console.log("Incrementing counts")
      addedSongs++;
      // console.log("Keys:")
      // console.log("\tsongKey:", songKey);
      // console.log("\t\tsongData =", modifiedSongs[songKey]);
      // console.log("\talbumKey:", albumKey);
      // console.log("\t\talbumData =", modifiedAlbums[albumKey]);
      // console.log("\tartistKey:", artistKey);
      // console.log("\t\tartistData =", modifiedArtists[artistKey]);
      modifiedAlbums[albumKey].songCount++;
      modifiedArtists[artistKey].songCount++;
    }
    songKeys.push(songKey);
  });

  /// THIS IS HERE FOR REFERENCE I THINK
  // Loop through the flattened albums
  // flattenedAlbums.forEach((albumData) => {
  //  // Extract artist, album, and song information from the flattened data
  //  const artistKey = utils.hash(albumData.artist);
  //  const albumKey = artistKey + "_" + utils.hash(album.album);
  //
  //  // Ensure the artist exists in the modifiedArtists dictionary
  //
  //  // Ensure the album exists in the modifiedAlbums dictionary
  //  if (!modifiedAlbums[albumKey]) {
  //    modifiedAlbums[albumKey] = {
  //      id : albumKey,
  //      artistId : artistKey,
  //      displayName : albumData.albumDisplayName.normalize("NFD").replace(
  //          /[\u0300-\u036f]/g, ""),
  //      artistDisplayName :
  //          albumData.artistDisplayName.normalize("NFD").replace(
  //              /[\u0300-\u036f]/g, ""),
  //      songCount : albumData.songs.length,
  //      imageUrl : albumData.imageUrl,
  //      added : Date.now(),
  //      visibleTo : [ "all" ],
  //      addedBy : user,
  //    };
  //  } else {
  //    modifiedAlbums[albumKey].songCount += albumData.songs.length;
  //  }
  //});

  // Process each song in the album
  //  albumData.songs.forEach((songData) => {
  //    const songKey = albumKey + "_" + songData.songId;
  //
  //    // Ensure the song exists in the modifiedSongs dictionary
  //    if (!modifiedSongs[songKey]) {
  //      modifiedSongs[songKey] = {
  //        id : songKey,
  //        albumId : albumKey,
  //        artistId : artistKey,
  //        displayName : songData.songDisplayName.normalize("NFD").replace(
  //            /[\u0300-\u036f]/g, ""),
  //        albumDisplayName :
  //            albumData.albumDisplayName.normalize("NFD").replace(
  //                /[\u0300-\u036f]/g, ""),
  //        artistDisplayName :
  //            albumData.artistDisplayName.normalize("NFD").replace(
  //                /[\u0300-\u036f]/g, ""),
  //        duration : 0, // You can adjust duration based on your data if
  //        needed youtubeId : songData.songYoutubeId, imageUrl :
  //        albumData.imageUrl, added : Date.now(), visibleTo : [ "all" ],
  //        addedBy : user,
  //      };
  //    }
  //  });
  //});

  // Convert modified dictionaries to arrays
  var modifiedSongsList = Object.values(modifiedSongs);
  var modifiedAlbumsList = Object.values(modifiedAlbums);
  var modifiedArtistsList = Object.values(modifiedArtists);

  // Continue with your existing logic here if needed
  // await waitUntil(() => {return iterated == msg.items.length}, {timeout:
  // Number.POSITIVE_INFINITY}); console.log(`Adding ${songs.length} songs,
  // ${albums.length} albums and ${artists.length} artists.`);
  iterated = 0;
  // var modifiedSongsList = Object.values(modifiedSongs);
  // var modifiedAlbumsList = Object.values(modifiedAlbums);
  // var modifiedArtistsList = Object.values(modifiedArtists);
  modifiedArtistsList.forEach(async (x) => {
    if (x.imageUrl == "") {
      x.imageUrl = await utils.getArtistImageUrl(
          x.displayName.split(",")[0],
          "https://commons.wikimedia.org/wiki/File:Apple_Music_Icon.svg");
    }
    iterated++;
  });
  await waitUntil(() => {return iterated == modifiedArtistsList.length},
                  {timeout : Number.POSITIVE_INFINITY});
  // console.log(JSON.stringify(modifiedArtists, null, 2));
  // console.log("Albums")
  // console.log(JSON.stringify(modifiedAlbums, null, 2));
  // console.log("Songs")
  // console.log(JSON.stringify(modifiedSongs, null, 2));
  return {
    artists : modifiedArtistsList,
    albums : modifiedAlbumsList,
    songs : modifiedSongsList,
    artistCount : modifiedArtistsList.length,
    albumCount : modifiedAlbumsList.length,
    songCount : modifiedSongsList.length
  };
}

function flattenData(input) {
  const artists = [];
  const albums = [];
  const songs = [];

  input.forEach(artistData => {
    // Flatten artists
    const artistName = artistData.name;
    artists.push({
      name : artistName,
      visibleTo : artistData.visibleTo == undefined ? [ "all" ]
                                                    : artistData.visibleTo,
      albumCount : artistData.albums.length,
      songCount : artistData.albums.reduce(
          (total, album) => total + album.songs.length, 0),
    });

    artistData.albums.forEach(albumData => {
      // Flatten albums
      const albumName = albumData.name;
      const albumImageUrl = albumData.imageUrl;
      albums.push({
        name : albumName,
        artist : artistName,
        imageUrl : albumImageUrl,
        visibleTo : albumData.visibleTo == undefined ? [ "all" ]
                                                     : albumData.visibleTo,
        songCount : albumData.songs.length,
      });

      albumData.songs.forEach(songData => {
        // Flatten songs
        songs.push({
          name : songData.name,
          videoId : songData.videoId,
          imageUrl : songData.imageUrl,
          album : albumName,
          artist : artistName,
          visibleTo : songData.visibleTo == undefined ? [ "all" ]
                                                      : songData.visibleTo
        });
      });
    });
  });

  return {artists : artists, albums : albums, songs : songs};
}

export default {
  flattenData: flattenData,
  adderMergeLogic: adderMergeLogic,
  adderConnection: adderConnection,
  clientId: clientID,
  clientSecret: secretKey,
};
