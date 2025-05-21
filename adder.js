// Just some crazy stuff I found in a Stack Overflow
import { createRequire } from "module";
const require = createRequire(import.meta.url);

import utils from "./utils.js";

const clientID = "0a65ebdec6ec4983870a7d2f51af2aa1";
const secretKey = "22714014e04f46cebad7e03764beeac8";
const fs = require("fs");

import YTMusic from "ytmusic-api";

const yt = new YTMusic();
await yt.initialize();

function adderConnection(socket, db, ts, spotifyHandler) {
  console.log("a user connected");
  socket.emit("authprompt", "3141592653589793238464");
  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
  var authed = false;
  var user = "";
  socket.on("auth", async (msg) => {
    // TODO make sure user has adder role
    if (typeof msg == "string") {
      msg = JSON.parse(msg);
    }
    var aut = await utils.checkAuth(msg.authtoken, db);
    //console.log(aut, msg.authtoken, typeof msg);
    if (!aut) {
      socket.emit("authresult", {
        success: false,
        error: "Invalid authtoken",
        authorized: false,
      });
      return;
    }
    socket.emit("authresult", { success: true, authorized: true });
    user = await utils.getUser(msg.authtoken, db);
    console.log("Allowing", user, "to add songs");
    authed = true;
  });

  socket.on("search", async (msg) => {
    if (!authed) {
      socket.emit("message", {
        type: "auth",
        success: false,
        error: "Invalid authtoken",
        authorized: false,
      });
      return;
    }
    if (typeof msg == "string") {
      msg = JSON.parse(msg);
    }
    console.log("Search", msg);
    if (msg.source == "spotify") {
      if (msg.query == "") {
        socket.emit("message", {
          type: "error",
          success: false,
          error: "No query provided",
          authorized: true,
        });
        return;
      }

      try {
        if (!spotifyHandler.isUserAuthenticated()) {
          socket.emit("message", {
            type: "auth",
            success: false,
            error: "Spotify authentication required",
            authorized: true,
            requiresSpotify: true,
          });
          return;
        }

        var page = 0;
        if (typeof msg.page == "number") {
          page = msg.page;
        }

        const results = await spotifyHandler.search(
          msg.query,
          msg.mediaType,
          page,
        );
        console.log("Search results:", results);
        socket.emit("searchresults", { type: msg.mediaType, results: results });
      } catch (error) {
        console.error("Spotify search error:", error);
        socket.emit("message", {
          type: "error",
          success: false,
          error: "Failed to search Spotify",
          authorized: true,
        });
      }
    } else if (msg.source == "youtube") {
      socket.emit("searchresults", { type: msg.mediaType, results: [] });
    }
  });

  socket.on("find", async (msg) => {
    if (!authed) {
      socket.emit("message", {
        type: "auth",
        success: false,
        error: "Invalid authtoken",
        authorized: false,
      });
      return;
    }
    if (typeof msg == "string") {
      msg = JSON.parse(msg);
    }
    if (msg.source == "spotify") {
      try {
        if (!spotifyHandler.isUserAuthenticated()) {
          socket.emit("message", {
            type: "auth",
            success: false,
            error: "Spotify authentication required (contact Jedi)",
            authorized: true,
            requiresSpotify: true,
          });
          return;
        }

        const found = await spotifyHandler.findItems(
          msg.selected,
          user,
          (progress) => {
            console.log("Progress:", progress.completed, "/", progress.total);
            socket.emit("findprogress", {
              completed: progress.completed,
              total: progress.total,
            });
          },
        );
        //fs.writeFileSync("adder-out.json", JSON.stringify(found[0], null, 2));
        console.log("AdderConnection: Found items:", found.length);
        fs.writeFileSync("find-out.json", JSON.stringify(found, null, 2));
        socket.emit("findresults", {
          results: found,
          isPlaylist: found.length == 1 && found[0].type == "playlist",
        });
      } catch (error) {
        console.error("Error finding items:", error);
        socket.emit("message", {
          type: "error",
          success: false,
          error: "Failed to find items",
          authorized: true,
        });
      }
    } else if (msg.source == "youtube") {
      socket.emit("findresults", { results: [] });
      socket.emit("message", {
        type: "auth",
        success: false,
        error: "Not implemented",
        authorized: true,
      });
    }
  });
  socket.on("playlist", async (msg) => {
    if (!authed) {
      socket.emit("message", {
        type: "auth",
        success: false,
        error: "Invalid authtoken",
        authorized: false,
      });
      return;
    }
    if (typeof msg == "string") {
      msg = JSON.parse(msg);
    }
    var mapped = msg.songs.map(song => ({
      externalId: "songs don't get extern album ids",
      name: "not used",
      artist: song.artist,
      album: song.album,
      imageUrl: song.albumCoverURL,
      artistImageUrl: song.artistImageUrl,
      visibleTo: song.visibleTo,
      inLibrary: song.inLibrary,
      type: "song",
      songs: [
        {
          title: song.title || "junk",
          url: song.url,
          trackNumber: song.trackNumber,
          externalId: song.externalId,
        }
      ]
    }));
    socket.emit("findresults", {results: mapped});
    /*
      {
        "externalId": "4pyIuEQo27lFOEMBJagRAv",
        "songPosition": 0,
        "title": "Up + Up",
        "album": "Up + Up",
        "artist": "Colton Dixon",
        "albumCoverURL": "https://i.scdn.co/image/ab67616d0000b273836e31330fbf127d9ed669a9",
        "artistImageUrl": "https://i.scdn.co/image/ab6761610000e5ebde3ae71d126f8573672ec292",
        "visibleTo": [
          "all"
        ],
        "inLibrary": [
          "jedi"
        ],
        "url": "youtube:td1ZTxCrdic",
        "trackNumber": -2,
        "type": "song"
      },
    */
  })

  socket.on("add", async (msg) => {
    if (!authed) {
      socket.emit("message", {
        type: "auth",
        success: false,
        error: "Invalid authtoken",
        authorized: false,
      });
      return;
    }
    console.log("Into add message");
    if (typeof msg == "string") {
      msg = JSON.parse(msg);
    }

    fs.writeFileSync("adder-in.json", JSON.stringify(msg, null, 2));
    //console.log("MSG:", JSON.stringify(msg, null, 2));

    var artists = [];
    var albums = [];
    var songs = [];
    var addedArtists = 0;
    var addedAlbums = 0;
    var addedSongs = 0;
    console.log("Fetching from db");
    songs = await db.collection("songs").find().toArray();
    artists = await db.collection("artists").find().toArray();
    albums = await db.collection("albums").find().toArray();
    console.log("Fetched");
    songs = JSON.parse(JSON.stringify(songs));
    artists = JSON.parse(JSON.stringify(artists));
    albums = JSON.parse(JSON.stringify(albums));

    var newArtists = [];
    var newAlbums = [];
    var newSongs = [];
    if (msg.playlist != null) {
      console.log("Flattening data");
      const flattenedData = flattenData(msg.playlist.songs, user); // data is kinda flattened
      // note: write custom function to turn find result into arrays
      newSongs = flattenedData.songs;
      newAlbums = flattenedData.albums;
      newArtists = flattenedData.artists;
      console.log(newArtists);
    } else {
      const flattenedData = flattenData(msg.hierarchy, user);
      newSongs = flattenedData.songs;
      newAlbums = flattenedData.albums;
      newArtists = flattenedData.artists;
      // console.log("Break at adding");
      // return;
    }
    // Create dictionaries to track modified songs, albums, and artists
    const mergedOutput = await adderMergeLogic(
      artists,
      albums,
      songs,
      newArtists,
      newAlbums,
      newSongs,
      user,
    );
    fs.writeFileSync("adder-out.json", JSON.stringify(mergedOutput, null, 2));
    var modifiedArtists = mergedOutput.artists;
    var modifiedAlbums = mergedOutput.albums;
    var modifiedSongs = mergedOutput.songs;
    var modifiedPlaylists = mergedOutput.playlists || [];
    if (modifiedPlaylists != []) console.log(" - Creating playlist(s)");
    addedArtists = mergedOutput.artistCount;
    addedAlbums = mergedOutput.albumCount;
    addedSongs = mergedOutput.songCount;
    console.log(
      "Adding",
      addedArtists,
      "artists,",
      addedAlbums,
      "albums,",
      addedSongs,
      "songs",
    );

    //console.log(JSON.stringify(modifiedArtists, null, 2));
    //console.log("Albums");
    //console.log(JSON.stringify(modifiedAlbums, null, 2));
    //console.log("Songs");
    //console.log(JSON.stringify(modifiedSongs, null, 2));
    var json = JSON.stringify(
      {
        songs: songs,
        albums: albums,
        artists: artists,
      },
      null,
      2,
    );
    fs.writeFileSync("data.json", json);
    json = JSON.stringify(
      {
        songs: modifiedSongs,
        albums: modifiedAlbums,
        artists: modifiedArtists,
      },
      null,
      2,
    );
    fs.writeFileSync("modifiedData.json", json);
    // await persistChanges(
    //   modifiedArtists,
    //   modifiedAlbums,
    //   modifiedSongs,
    //   modifiedPlaylists,
    //   db,
    //   ts,
    // );
    console.log("Finished adding songs, albums and artists.");
    socket.emit("addresult", {
      success: true,
      count: {
        artists: addedArtists,
        albums: addedAlbums,
        songs: addedSongs,
      },
    });
  });
}

async function adderMergeLogic(
  oldArtists,
  oldAlbums,
  oldSongs,
  flattenedArtists,
  flattenedAlbums,
  flattenedSongs,
  user,
) {
  console.log("Into merge logic");
  //console.log(JSON.stringify(hierearchyData, null, 2));
  var artists = [];
  var artistKeys = [];
  var albums = [];
  var albumKeys = [];
  var songs = [];
  var songKeys = [];
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
  //console.log(flattenedArtists);

  // Create dictionaries to track modified songs, albums, and artists
  var modifiedSongs = {};
  var modifiedAlbums = {};
  var modifiedArtists = {};
  flattenedArtists.forEach((artistData) => {
    //console.log(artistData);
    const artistKey = utils.hash(artistData.displayName);
    if (artistKeys.includes(artistKey)) {
      console.log("artistKey already exists for", artistData.displayName);
      if (artists[artistKeys.indexOf(artistKey)] == undefined)
        // fix for duplicate artists in the same modifiedArtists
        return;
      modifiedArtists[artistKey] = artists[artistKeys.indexOf(artistKey)];

      modifiedArtists[artistKey].visibleTo = [
        ...new Set(
          artists[artistKeys.indexOf(artistKey)].visibleTo.concat(
            artistData.visibleTo,
          ),
        ),
      ];
      if (!modifiedArtists[artistKey].inLibrary.includes(user)) {
        console.log("Adding " + user + " to " + artistData.displayName);
        modifiedArtists[artistKey].inLibrary.push(user);
      }
      //addedArtists--;
      return;
    }
    modifiedArtists[artistKey] = {
      id: artistKey,
      displayName: artistData.displayName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""),
      imageUrl: artistData.imageUrl,
      added: Date.now(),
      visibleTo: artistData.visibleTo,
      addedBy: user,
      songCount: 0,
      albumCount: 0,
      inLibrary: [user],
    };
    artistKeys.push(artistKey);
    addedArtists++;
  });
  flattenedAlbums.forEach((albumData) => {
    const artistKey = utils.hash(albumData.artistDisplayName);
    const albumKey = artistKey + "_" + utils.hash(albumData.displayName);
    //console.log("albumKey", albumKey);
    if (albumKeys.includes(albumKey)) {
      console.log("albumKey already exists for", albumData.displayName);
      if (albums[albumKeys.indexOf(albumKey)] == undefined) return;
      modifiedAlbums[albumKey] = albums[albumKeys.indexOf(albumKey)];
      modifiedAlbums[albumKey].visibleTo = [
        ...new Set(
          albums[albumKeys.indexOf(albumKey)].visibleTo.concat(
            albumData.visibleTo,
          ),
        ),
      ];
      if (!modifiedAlbums[albumKey].inLibrary.includes(user)) {
        console.log("Adding " + user + " to " + albumData.displayName);
        modifiedAlbums[albumKey].inLibrary.push(user);
      }
      //addedAlbums--;
      return;
    }
    modifiedAlbums[albumKey] = {
      id: albumKey,
      artistId: artistKey,
      displayName: albumData.displayName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""),
      artistDisplayName: albumData.artistDisplayName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""),
      songCount: 0,
      imageUrl: albumData.imageUrl,
      added: Date.now(),
      visibleTo: albumData.visibleTo,
      inLibrary: [user],
      addedBy: user,
    };
    //console.log("album inside flattenedalbums", modifiedAlbums[albumKey]);
    albumKeys.push(albumKey);
    addedAlbums++;
  });

  flattenedSongs.forEach((songData) => {
    console.log(songData);
    const artistKey = utils.hash(songData.artistDisplayName);
    const albumKey = artistKey + "_" + utils.hash(songData.albumDisplayName);
    const songKey =
      albumKey +
      "_" +
      utils.hash(
        songData.displayName.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
      );

    if (
      songKeys.includes(songKey) &&
      modifiedSongs[songKeys.indexOf(songKey)] != undefined
    ) {
      console.log("songKey already exists for", songData.displayName);
      console.log(
        songKey,
        "==",
        modifiedSongs[songKeys.indexOf(songKey)],
        "index:length",
        songKeys.indexOf(songKey),
        songKeys.length,
      );
      modifiedSongs[songKey] = songs[songKeys.indexOf(songKey)];
      try {
        modifiedSongs[songKey].visibleTo = [
          ...new Set(
            songs[songKeys.indexOf(songKey)].visibleTo.concat(
              songData.visibleTo,
            ),
          ),
        ];
        if (!modifiedSongs[songKey].inLibrary.includes(user)) {
          console.log("Adding " + user + " to " + songData.displayName);
          modifiedSongs[songKey].inLibrary.push(user);
        }
      } catch (e) {
        console.log("error", e);
        console.log(JSON.stringify(songData, null, 2));
        throw e;
      }
      return;
    }
    console.log("Song audioUrl =", songData.audioUrl);
    console.log("Song url =", songData.url);

    modifiedSongs[songKey] = {
      id: songKey,
      albumId: albumKey,
      artistId: artistKey,
      displayName: songData.displayName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""),
      albumDisplayName: songData.albumDisplayName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""),
      artistDisplayName: songData.artistDisplayName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""),
      duration: 0,
      trackNumber: songData.trackNumber || -1,
      audioUrl: songData.audioUrl,
      imageUrl: songData.imageUrl,
      added: Date.now(),
      visibleTo: songData.visibleTo,
      inLibrary: [user],
      addedBy: user,
    };

    if (!songKeys.includes(songKey)) {
      addedSongs++;
      console.log("\t\tsongName =", modifiedSongs[songKey].displayName);
      console.log("\t\talbumName =", modifiedAlbums[albumKey].displayName);
      console.log("\t\tartistName =", modifiedArtists[artistKey].displayName);
    }
    songKeys.push(songKey);
  });

  // Convert modified dictionaries to arrays
  var modifiedSongsList = Object.values(modifiedSongs);
  var modifiedAlbumsList = Object.values(modifiedAlbums);
  var modifiedArtistsList = Object.values(modifiedArtists);

  await Promise.all(
    modifiedArtistsList.map(async (x) => {
      if (x.imageUrl == "") {
        console.log("No image url for", x.displayName);
        x.imageUrl = await utils.getArtistImageUrl(
          x.displayName.split(",")[0],
          //"https://commons.wikimedia.org/wiki/File:Apple_Music_Icon.svg",
          "https://www.pngarts.com/files/8/Apple-Music-Logo-PNG-Photo.png",
        );
        console.log("Updated image url for", x.displayName);
      }
      //iterated++;
    }),
  );
  // console.log(JSON.stringify(modifiedArtists, null, 2));
  // console.log("Albums")
  // console.log(JSON.stringify(modifiedAlbums, null, 2));
  // console.log("Songs")
  // console.log(JSON.stringify(modifiedSongs, null, 2));
  return {
    artists: modifiedArtistsList,
    albums: modifiedAlbumsList,
    songs: modifiedSongsList,
    artistCount: addedArtists,
    albumCount: addedAlbums,
    songCount: addedSongs,
  };
}

function flattenData(input, user) {
  const artists = [];
  const albums = [];
  const songs = [];
  //console.log(`Flattening ${input} items...`);
  console.log(input);
  input.forEach((artistData) => {
    var artistPublic = false;
    // Flatten artist
    const artistName = artistData.name;
    artistData.albums.forEach((albumData) => {
      // Flatten albums
      const albumName = albumData.name;
      const albumImageUrl = albumData.imageUrl;
      albums.push({
        displayName: albumName,
        artistDisplayName: artistName,
        imageUrl: albumImageUrl,
        visibleTo:
          albumData.visibleTo == undefined ? [user] : albumData.visibleTo,
        inLibrary: [user],
        songCount: 0,
      });
      if (
        albumData.visibleTo != undefined &&
        albumData.visibleTo.includes("all")
      )
        artistPublic = true;

      albumData.songs.forEach((songData) => {
        // Flatten songs
        songs.push({
          displayName: songData.name,
          audioUrl: songData.audioUrl,
          imageUrl: songData.imageUrl,
          albumDisplayName: albumName,
          artistDisplayName: artistName,
          visibleTo:
            songData.visibleTo == undefined ? [user] : songData.visibleTo,
          inLibrary: [user],
          trackNumber: songData.trackNumber,
          externalId: songData.externalId,
        });
      });
    });

    artists.push({
      displayName: artistName,
      visibleTo:
        artistData.visibleTo == undefined || artistPublic
          ? [user]
          : artistData.visibleTo,
      inLibrary: [user],
      imageUrl: artistData.imageUrl,
      albumCount: 0,
      songCount: 0,
    });
  });

  return { artists: artists, albums: albums, songs: songs };
}

async function persistChanges(
  modifiedArtists,
  modifiedAlbums,
  modifiedSongs,
  modifiedPlaylists,
  db,
  ts,
) {
  console.log("DB upsert");
  // Delete _id field from objects before updating
  console.log(modifiedArtists);
  const artistsToUpdate = modifiedArtists.map((artist) => {
    const { _id, ...artistWithoutId } = artist;
    return artistWithoutId;
  });
  const albumsToUpdate = modifiedAlbums.map((album) => {
    const { _id, ...albumWithoutId } = album;
    return albumWithoutId;
  });
  const songsToUpdate = modifiedSongs.map((song) => {
    const { _id, ...songWithoutId } = song;
    return songWithoutId;
  });

  await db.collection("artists").bulkWrite(
    artistsToUpdate.map((artist) => ({
      updateOne: {
        filter: { id: artist.id },
        update: { $set: artist },
        upsert: true,
      },
    })),
  );

  await db.collection("albums").bulkWrite(
    albumsToUpdate.map((album) => ({
      updateOne: {
        filter: { id: album.id },
        update: { $set: album },
        upsert: true,
      },
    })),
  );

  await db.collection("songs").bulkWrite(
    songsToUpdate.map((song) => ({
      updateOne: {
        filter: { id: song.id },
        update: { $set: song },
        upsert: true,
      },
    })),
  );
  console.log("Typesense update");
  await ts.updateSongs(songsToUpdate);
  await ts.updateAlbums(albumsToUpdate);
  await ts.updateArtists(artistsToUpdate);
  // Save as json for easy debugging
  fs.writeFileSync(
    "./backup/new_songs.json",
    JSON.stringify(songsToUpdate, null, 2),
  );
  fs.writeFileSync(
    "./backup/new_albums.json",
    JSON.stringify(albumsToUpdate, null, 2),
  );
  fs.writeFileSync(
    "./backup/new_artists.json",
    JSON.stringify(artistsToUpdate, null, 2),
  );
}

export default {
  flattenData: flattenData,
  persistChanges: persistChanges,
  adderMergeLogic: adderMergeLogic,
  adderConnection: adderConnection,
  clientId: clientID,
  clientSecret: secretKey,
};
