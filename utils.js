//Just some crazy stuff I found in a Stack Overflow
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const path = require('path');
import {fileURLToPath} from 'url';
const __filename = fileURLToPath(import.meta.url);
const util = require('util');
import crypto from 'crypto';
const exec = util.promisify(require('child_process').exec);

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

async function checkAuth(token, db){
    if(typeof(token) == "undefined"){
        return Promise.resolve(false); 
    }else{
        const result = await db.auth.findOne({selector: {"authtoken": token}}).exec()
        return Promise.resolve(result != null);
    }
}

async function getUser(authtoken, db){
    var result = await db.auth.findOne({selector: {"authtoken": authtoken}}).exec()
    return (result == 0) ? "" : result.loginName
}

async function addToRecentlyPlayed(user, songId, db){
    var recent = await db.played.findOne({selector: {"owner": user}}).exec();
    if(recent == null || recent == undefined || recent.songs[recent.songs.length-1] == songId) return;
    console.log("Adding to recent: ",user, songId)
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

function hash(string){
    return crypto.createHash('sha256').update(string).digest('hex');
}

async function deleteSong(id, user, db, ts){
  var song = await db.songs.findOne({selector: {id: id}}).exec()
  if(song == null) return
  await db.changelog.upsert({
    time: Date.now(),
    user: user,
    type: "song",
    field: "all",
    old: JSON.stringify(song),
    new: "null"
  })
  var album = await db.albums.findOne({selector: {id: song.albumId}}).exec();
  if(album.songCount == 1) await deleteAlbum(album.id, user, db)
  var artist = await db.artists.findOne({selector: {id: song.artistId}}).exec();
  if(artist.songCount == 1 && artist.albumCount == 1) await deleteArtist(artist.id, user, db)
  try{
    await ts.deleteSong(song.id);
  }catch(e){}
  try{
    await song.remove();
  }catch(e){}
}

async function deleteAlbum(id, user, db, ts){
  var album = await db.albums.findOne({selector: {id: id}}).exec()
  if(album == null) return
  await db.changelog.upsert({
    time: Date.now(),
    user: user,
    type: "album",
    field: "all",
    old: JSON.stringify(album),
    new: "null"
  })
  try{
    await ts.deleteAlbum(album.id);
  }catch(e){}
  try{
    await album.remove();
  }catch(e){}
}

async function deleteArtist(id, user, db, ts){
  var artist = await db.artists.findOne({selector: {id: id}}).exec()
  if(artist == null) return
  await db.changelog.upsert({
    time: Date.now(),
    user: user,
    type: "artist",
    field: "all",
    old: JSON.stringify(artist),
    new: "null"
  })
  try{
    await ts.deleteArtist(artist.id);
  }catch(e){}
  try{
    await artist.remove();
  }catch(e){}
}

export default {
  hash: hash,
  getArtistImageUrl: getArtistImageUrl,
  checkAuth: checkAuth,
  getUser: getUser,
  addToRecentlyPlayed: addToRecentlyPlayed,
  deleteSong: deleteSong,
  deleteAlbum: deleteAlbum,
  deleteArtist: deleteArtist
}
