import db from "./db.js";
import client from "./ts.js";
import schemas from "./schemas.js";

export default {
  purge: async () => {
    try{
      await client.collections("taxi-songs").delete();
      await client.collections("taxi-albums").delete();
      await client.collections("taxi-artists").delete();
      await client.collections("taxi-relevance").delete();
    }catch(e){
      console.log("No collections to delete");
    }

    for(const schema of schemas.typesenseCollections){
      try{
        console.log("Creating collection "+schema.name);
        await client.collections().create(schema);
      }catch(e){
        console.log("Error creating collection "+schema.name, e);
      }
    }
    var songs = await db.songs.find().exec();
    var albums = await db.albums.find().exec();
    var artists = await db.artists.find().exec();

    await client.collections('taxi-songs').documents().import(songs, {action: "upsert"});
    await client.collections('taxi-albums').documents().import(albums, {action: "upsert"});
    await client.collections('taxi-artists').documents().import(artists, {action: "upsert"});
    
    await client.collections('taxi-relevance').documents().import(songs.map(x => ({
      id: x.id,
      displayName: x.displayName,
      imageUrl: x.imageUrl,
      type: 'song'
    })), {action: "upsert"});
    await client.collections('taxi-relevance').documents().import(albums.map(x => ({
      id: x.id,
      displayName: x.displayName,
      imageUrl: x.imageUrl,
      type: 'album'
    })), {"action": "upsert"});
    await client.collections('taxi-relevance').documents().import(artists.map(x => ({
      id: x.id,
      displayName: x.displayName,
      imageUrl: x.imageUrl,
      type: 'artist'
    })), {"action": "upsert"});

    var songC = (await client.collections('taxi-songs').retrieve()).num_documents;
    var albumC = (await client.collections('taxi-albums').retrieve()).num_documents;
    var artistC = (await client.collections('taxi-artists').retrieve()).num_documents;
    var relevanceC = (await client.collections('taxi-relevance').retrieve()).num_documents;

    console.log("Imported the following:");
    console.table([
      {
        name: "songs",
        count: songC
      },
      {
        name: "albums",
        count: albumC
      },
      {
        name: "artists",
        count: artistC
      },
      {
        name: "relevancy",
        count: relevanceC
      }
    ]);
  },
  destroy: async () => {
    await db.destroy();
  },
  searchArtist: async (query) => {
    return (await client.collections('taxi-artists').documents().search({
      "q": query,
      "query_by": "displayName",
    })).hits.map(x => x.document);
  },
  searchAlbum: async (query) => {
    return (await client.collections('taxi-albums').documents().search({
      "q": query,
      "query_by": "displayName",
    })).hits.map(x => x.document);
  },
  searchSong: async (query) => {
    return (await client.collections('taxi-songs').documents().search({
      "q": query,
      "query_by": "displayName",
    })).hits.map(x => x.document);
  },
  searchRelevancy: async (query) => {
    return (await client.collections('taxi-relevance').documents().search({
      "q": query,
      "query_by": "displayName",
    })).hits.map(x => x.document);
  },
  relevancy: async (query) => {
    return (await client.collections('taxi-relevance').documents().search({
      "q": query,
      "query_by": "displayName",
    })).hits.map(x => x.document);
  },
  updateSong: async (song) => {
    await client.collections('taxi-songs').documents().upsert(song);
    song.type = 'song';
    await client.collections('taxi-relevance').documents().upsert(song);
  },
  updateAlbum: async (album) => {
    await client.collections('taxi-albums').documents().upsert(album);
    album.type = 'album';
    await client.collections('taxi-relevance').documents().upsert(album);
  },
  updateArtist: async (artist) => {
    await client.collections('taxi-artists').documents().upsert(artist);
    artist.type = 'artist';
    await client.collections('taxi-relevance').documents().upsert(artist);
  },
  updateSongs: async (songs) => {
    await client.collections('taxi-songs').documents().import(songs, {"action": "upsert"});
    songs.forEach(x => x.type = 'song');
    await client.collections('taxi-relevance').documents().import(songs, {"action": "upsert"});
  },
  updateAlbums: async (albums) => {
    await client.collections('taxi-albums').documents().import(albums, {"action": "upsert"});
    albums.forEach(x => x.type = 'album');
    await client.collections('taxi-relevance').documents().import(albums, {"action": "upsert"});
  },
  updateArtists: async (artists) => {
    await client.collections('taxi-artists').documents().import(artists, {"action": "upsert"});
    artists.forEach(x => x.type = 'artist');
    await client.collections('taxi-relevance').documents().import(artists, {"action": "upsert"});
  }
}
