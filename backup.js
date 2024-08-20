import db from './db.js';
import fs from 'fs';

console.log("Added collections");
var songs = await db.songs.find().exec();
var albums = await db.albums.find().exec();
var artists = await db.artists.find().exec();
var playlists = await db.playlists.find().exec();
var users = await db.auth.find().exec();
var recentlyPlayed = await db.played.find().exec();
var checklist = await db.checklist.find().exec();

fs.writeFileSync('./backup/songs.json', JSON.stringify(songs));
fs.writeFileSync('./backup/albums.json', JSON.stringify(albums));
fs.writeFileSync('./backup/artists.json', JSON.stringify(artists));
fs.writeFileSync('./backup/playlists.json', JSON.stringify(playlists));
fs.writeFileSync('./backup/auth.json', JSON.stringify(users));
fs.writeFileSync('./backup/played.json', JSON.stringify(recentlyPlayed));
fs.writeFileSync('./backup/checklist.json', JSON.stringify(checklist));

await db.destroy();
