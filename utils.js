//Just some crazy stuff I found in a Stack Overflow
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const path = require("path");
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const util = require("util");
import crypto from "crypto";
const exec = util.promisify(require("child_process").exec);
const { waitUntil } = require("async-wait-until");
import { EventEmitter } from "events";

async function getArtistImageUrl(name, backupImageUrl) {
  console.log("Getting image for " + name);
  const { stdout, stderr } = await exec(
    'python3 find_artist_profile_url.py "' + name + '"',
  );
  var data = {};
  console.log(stdout);
  try {
    data = JSON.parse(stdout);

    if (data["success"]) {
      return data["url"];
    }
    if (!data["success"]) {
      return backupImageUrl;
    }
  } catch (err) {
    console.log(err);
    return backupImageUrl;
  }
}

async function checkAuth(token, db) {
  if (typeof token == "undefined") {
    return Promise.resolve(false);
  } else {
    const result = await db.collection("auth").findOne({ authtoken: token });
    return Promise.resolve(result != null);
  }
}

async function getUser(authtoken, db) {
  var result = await db.collection("auth").findOne({ authtoken: authtoken });
  return result == 0 ? "" : result.loginName;
}

async function addToRecentlyPlayed(user, songId, db) {
  // TODO NEED TO FIX
  var recent = await db.collection("played").findOne({ owner: user });
  if (recent != null && recent.songs[0].id == songId) return;
  console.log("Adding to recent: ", user, songId);
  songId = songId.toString();
  if (songId == "undefined") return;
  var song = await db.collection("songs").findOne({ id: songId });
  if (song == null) return;
  console.log("Song: ", song);
  var newRecent = {owner: user};
  if (recent == null) {
    console.log("Recent is null");
    newRecent.songs = [song];
  } else {
    newRecent.songs = recent.songs;
    if (recent.songs.length >= 256) {
      console.log("Too long");
      newRecent.songs.shift();
    }
    newRecent.songs.unshift(song);
  }
  await db
    .collection("played")
    .updateOne({ owner: user }, { $set: newRecent }, { upsert: true });
}

function hash(string) {
  return crypto.createHash("sha256").update(string).digest("hex");
}
//TODO make all stuff below work
async function deleteSong(id, user, db, ts) {
  var song = await db.collection("songs").findOne({ id: id });
  if (song == null) return;
  await db.collection("changelog").updateOne(
    { time: Date.now(), user: user, type: "song" },
    {
      $set: {
        time: Date.now(),
        user: user,
        type: "song",
        field: "all",
        old: JSON.stringify(song),
        new: "null",
      },
    },
    { upsert: true },
  );
  var album = await db.collection("albums").findOne({ id: song.albumId });
  if (album.songCount == 1) await deleteAlbum(album.id, user, db);
  var artist = await db.collection("artists").findOne({ id: song.artistId });
  if (artist.songCount == 1 && artist.albumCount == 1)
    await deleteArtist(artist.id, user, db);
  try {
    await ts.deleteSong(song.id);
  } catch (e) {}
  try {
    await db.collection("songs").deleteOne({ id: song.id });
  } catch (e) {}
}

async function deleteAlbum(id, user, deleteSongs, db, ts) {
  var album = await db.collection("albums").findOne({ id: id });
  if (album == null) return;
  album.type = "album";
  var data = [];
  var songs = [];
  if (deleteSongs)
    songs = await db.collection("songs").find({ albumId: id }).toArray();
  var da = await db.collection("albums").find({ id: id }).toArray();
  songs.forEach((s) => {
    s.type = "song";
    data.push(s);
  });
  da.forEach((a) => {
    a.type = "album";
    data.push(a);
  });
  await batchDeleteItems(data, user, db, ts);
}

async function deleteArtist(id, user, deleteSongs, deleteAlbums, db, ts) {
  var artist = await db.collection("artists").findOne({ id: id });
  if (artist == null) return;
  artist.type = "artist";
  var data = [artist];
  var albums = [];
  var songs = [];
  if (deleteSongs)
    songs = await db.collection("songs").find({ artistId: id }).toArray();
  if (deleteAlbums)
    albums = await db.collection("albums").find({ artistId: id }).toArray();
  songs.forEach((e) => {
    e.type = "song";
    data.push(e);
  });
  albums.forEach((e) => {
    e.type = "album";
    data.push(e);
  });
  console.log("Deleting a total of", data.length, "items");
  await batchDeleteItems(data, user, db, ts);
}

async function batchDeleteItems(data, user, db, ts) {
  var iterated = 0;
  data.forEach(async (x) => {
    await db.collection("changelog").updateOne(
      { time: Date.now(), user: user, type: x.type },
      {
        $set: {
          time: Date.now(),
          user: user,
          type: x.type,
          field: "all",
          old: JSON.stringify(x),
          new: null,
        },
      },
      { upsert: true },
    );
    switch (x.type) {
      case "song":
        await ts.deleteSong(x.id);
        break;
      case "album":
        await ts.deleteAlbum(x.id);
        break;
      case "artist":
        await ts.deleteArtist(x.id);
        break;
      default:
        console.log("Unknown type", x.type);
        break;
    }
    await db.collection(x.type + "s").deleteOne({ id: x.id });
    iterated++;
  });
  const {eventStream, allSettledPromise} = trackProgressEvent(data.map(x => db.collection(x.type+"s").deleteOne({id: x.id})));
  eventStream.on('progress', e => console.log(`Progress: ${e.completed}/${e.total}`));
  await allSettledPromise;
  console.log("Finished deleting items");
}

const spotifyUrlRegex =
  /https:\/\/open\.spotify\.com\/(track|album|artist|playlist)\/([^?]*)(\?si=.*)?/;


function trackProgressEvent(promises) {
    const emitter = new EventEmitter();
    let completed = 0;
    const total = promises.length;
    const results = [];

    const wrappedPromises = promises.map(async (p, index) => {
        try {
            const result = await p;
            results[index] = { status: 'fulfilled', value: result };
            completed++;
            emitter.emit('progress', { completed, total });
            return result;
        } catch (error) {
            results[index] = { status: 'rejected', reason: error };
            completed++;
            emitter.emit('progress', { completed, total });
            throw error;
        }
    });

    const allSettledPromise = Promise.allSettled(wrappedPromises).then(() => {
        emitter.emit('done', results);
        return results;
    });
    
    return { emitter: emitter, promise: allSettledPromise };
}

export default {
  hash: hash,
  getArtistImageUrl: getArtistImageUrl,
  checkAuth: checkAuth,
  getUser: getUser,
  addToRecentlyPlayed: addToRecentlyPlayed,
  deleteSong: deleteSong,
  deleteAlbum: deleteAlbum,
  deleteArtist: deleteArtist,
  spotifyUrlRegex: spotifyUrlRegex,
  trackProgressEvent: trackProgressEvent,
};
