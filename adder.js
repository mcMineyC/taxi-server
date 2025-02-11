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

        const found = await spotifyHandler.findItems(msg.selected, user);
        //console.log(found);
        socket.emit("findresults", { results: found });
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
      socket.emit("findresults", { results: []});
      socket.emit("message", {
        type: "auth",
        success: false,
        error: "Not implemented",
        authorized: true,
      });
    }
  });

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
    console.log("MSG:", JSON.stringify(msg, null, 2));
    var artists = [];
    var albums = [];
    var songs = [];
    var addedArtists = 0;
    var addedAlbums = 0;
    var addedSongs = 0;
    songs = await db.collection("songs").find().toArray();
    artists = await db.collection("artists").find().toArray();
    albums = await db.collection("albums").find().toArray();
    songs = JSON.parse(JSON.stringify(songs));
    artists = JSON.parse(JSON.stringify(artists));
    albums = JSON.parse(JSON.stringify(albums));
    // Assuming that `flattenData` function already exists and returns flattened
    // arrays
    //
    //const { flattenedSongs, flattenedAlbums, flattenedArtists } = flattenData(
    //  msg.items,
    //);

    // Create dictionaries to track modified songs, albums, and artists
    const mergedOutput = await adderMergeLogic(
      artists,
      albums,
      songs,
      msg.hierarchy,
      user,
    );
    var modifiedArtists = mergedOutput.artists;
    var modifiedAlbums = mergedOutput.albums;
    var modifiedSongs = mergedOutput.songs;
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

    console.log("DB upsert");
    // Delete _id field from objects before updating
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
    //console.log("Typesense update");
    //await ts.updateSongs(modifiedSongs);
    //await ts.updateAlbums(modifiedAlbums);
    //await ts.updateArtists(modifiedArtists);
    fs.writeFileSync("./backup/new_songs.json", JSON.stringify(songs, null, 2));
    fs.writeFileSync(
      "./backup/new_albums.json",
      JSON.stringify(albums, null, 2),
    );
    fs.writeFileSync(
      "./backup/new_artists.json",
      JSON.stringify(artists, null, 2),
    );

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
  hierearchyData,
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
  const flattenedData = flattenData(hierearchyData, user);
  const flattenedSongs = flattenedData.songs;
  const flattenedAlbums = flattenedData.albums;
  const flattenedArtists = flattenedData.artists;
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
      if(!modifiedArtists[artistKey].inLibrary.includes(user)){
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
      if(!modifiedAlbums[albumKey].inLibrary.includes(user)){
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
    const artistKey = utils.hash(songData.artistDisplayName);
    const albumKey = artistKey + "_" + utils.hash(songData.albumDisplayName);
    const songKey =
      albumKey +
      "_" +
      utils.hash(
        songData.displayName.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
      );

    if (songKeys.includes(songKey)) {
      console.log("songKey already exists for", songData.displayName);
      modifiedSongs[songKey] = songs[songKeys.indexOf(songKey)];

      modifiedSongs[songKey].visibleTo = [
        ...new Set(
          songs[songKeys.indexOf(songKey)].visibleTo.concat(songData.visibleTo),
        ),
      ];
      return;
      if(!modifiedSongs[songKey].inLibrary.includes(user)){
        modifiedSongs[songKey].inLibrary.push(user);
      }
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
          audioUrl: songData.url,
          imageUrl: songData.imageUrl,
          albumDisplayName: albumName,
          artistDisplayName: artistName,
          visibleTo:
            songData.visibleTo == undefined ? [user] : songData.visibleTo,
          inLibrary: [user],
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

export default {
  flattenData: flattenData,
  adderMergeLogic: adderMergeLogic,
  adderConnection: adderConnection,
  clientId: clientID,
  clientSecret: secretKey,
};
