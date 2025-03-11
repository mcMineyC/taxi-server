import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import YTMusic from "ytmusic-api";
import utils from "./utils.js";

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { waitUntil } = require("async-wait-until");
const fs = require("fs");

class SpotifyHandler {
  constructor(clientId, clientSecret, redirectUri) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
    this.api = null;
    this.yt = new YTMusic();
    this.isInitialized = false;
    this.userTokeen = {}; // userId -> {accessToken, refreshToken, expirationTime}

    // User authentication state storage
    this.pendingStates = new Map(); // state -> userId
  }
  get userToken() {
    return this.userTokeen;
  }
  set userToken(value) {
    fs.writeFileSync("userToken.json", JSON.stringify(value, null, 2));
    this.userTokeen = value;
  }

  async initialize() {
    try {
      if (this.isInitialized) return;
      await this.yt.initialize();
      if (fs.existsSync("userToken.json")) {
        console.log("Restoring usertoken");
        this.userTokeen = JSON.parse(fs.readFileSync("userToken.json"));
      }
      this.isInitialized = true;
      console.log("SpotifyHandler initialized successfully");
    } catch (error) {
      console.error("Failed to initialize SpotifyHandler:", error);
      throw error;
    }
  }

  // Generate authorization URL for user login
  getAuthorizationUrl(userId) {
    const state = require("crypto").randomBytes(16).toString("hex");

    const scope = [
      "user-read-private",
      "user-read-email",
      "user-library-read",
      "playlist-read-private",
      "playlist-modify-public",
      "playlist-modify-private",
    ].join(" ");

    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      scope: scope,
      redirect_uri: this.redirectUri,
      state: state,
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  // Handle the callback from Spotify
  async handleCallback(code, state) {
    try {
      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " +
            Buffer.from(this.clientId + ":" + this.clientSecret).toString(
              "base64",
            ),
        },
        body: new URLSearchParams({
          code,
          redirect_uri: this.redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get access token");
      }

      const data = await response.json();

      // Store user tokens
      this.userToken = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expirationTime: Date.now() + data.expires_in * 1000,
      };

      await this.initializeUserApi();

      return "main";
    } catch (error) {
      console.error("Error handling callback:", error);
      throw error;
    }
  }

  // Initialize or refresh API instance for a specific user
  async initializeUserApi() {
    const userToken = this.userToken;
    if (!userToken) {
      throw new Error("User not authenticated");
    }

    this.api = SpotifyApi.withAccessToken(this.clientId, {
      access_token: userToken.accessToken,
      token_type: "Bearer",
      expires_in: Math.floor((userToken.expirationTime - Date.now()) / 1000),
      refresh_token: userToken.refreshToken,
    });
  }

  // Refresh user's access token
  async refreshUserToken() {
    const userToken = this.userToken;
    if (!userToken) {
      throw new Error("User not authenticated");
    }

    try {
      const refreshToken = userToken.refreshToken;
      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " +
            Buffer.from(this.clientId + ":" + this.clientSecret).toString(
              "base64",
            ),
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to refresh token");
      }

      const data = await response.json();
      this.userToken = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || userToken.refreshToken, // Some implementations don't return a new refresh token
        expirationTime: Date.now() + data.expires_in * 1000,
      };

      await this.initializeUserApi();
    } catch (error) {
      console.error("Error refreshing user token:", error);
      throw error;
    }
  }

  // Execute API call with automatic token refresh
  async executeUserAction(apiCall) {
    try {
      const userToken = this.userToken;
      if (!userToken) {
        throw new Error("User not authenticated");
      }

      // Check if token is expired or about to expire
      if (Date.now() >= userToken.expirationTime - 60000) {
        await this.refreshUserToken();
      }

      await this.initializeUserApi();
      return await apiCall();
    } catch (error) {
      if (error.status === 401) {
        await this.refreshUserToken();
        return await apiCall();
      }
      throw error;
    }
  }

  // Get user's profile
  async getUserProfile() {
    return this.executeUserAction(async () => {
      return await this.api.currentUser.profile();
    });
  }

  // Get user's playlists
  async getUserPlaylists() {
    return this.executeUserAction(async () => {
      return await this.api.currentUser.playlists.playlists();
    });
  }

  async getPlaylist(playlistId) {
    return this.executeUserAction(async () => {
      var res = await this.api.playlists.getPlaylist(playlistId);
      res.type = "playlist";
      return res;
    });
  }

  async getFullPlaylist(playlistId) {
    return this.executeUserAction(async () => {
      let allTracks = []; // Store all tracks
      var limit = 100; // Spotify API limit per request
      var offset = 0; // Start from the first track
      var totalTracks = 0;
      const playlist = await this.api.playlists.getPlaylist(playlistId);
      console.log("SpotifyHandler: Fetched playlist", playlist.name);
      //console.log(
      //"Playlist has",
      //playlist.tracks.total,
      //"tracks, but only",
      //playlist.tracks.items.length,
      //"are visible",
      //);

      //allTracks = playlist.tracks.items.map((item) => item.track);
      totalTracks = playlist.tracks.total;

      do {
        // Fetch playlist tracks with pagination
        const response = await this.api.playlists.getPlaylistItems(
          playlistId,
          null,
          null,
          limit,
          offset,
        );
        //console.log(playlist.tracks.total - offset, "tracks remaining");
        //console.log("Fetching", limit, "tracks from offset", offset);
        if (response.items && response.items.length > 0) {
          //console.log(
          //  "Retrieved",
          //  response.items.length,
          //  "tracks from the playlist.",
          //);
          allTracks.push(...response.items.map((item) => item.track));
          offset += response.items.length;
        } else {
          //console.log("Breaking");
          break; // Exit if no more items returned
        }

        totalTracks = response.total; // Total number of tracks in the playlist
      } while (offset <= totalTracks); // Continue fetching until all tracks are retrieved
      //console.log("Retrie", allTracks.length, "tracks from the playlist.");
      //console.log("Expected", playlist.tracks.total, "tracks in the playlist.");
      return {
        id: playlist.id,
        name: playlist.name,
        owner: playlist.owner.display_name,
        imageUrl: playlist.images[0].url,
        artistImageUrl:
          "https://www.tonicradio.fr/wp-content/uploads/2019/05/spotify-1759471_1920.jpg",
        description: playlist.description,
        isPublic: playlist.public,
        tracks: await this.mapSpotifyResults(allTracks),
        type: "playlist",
      }; // Return all the tracks in the playlist
    });
  }

  async getFullArtist(artistId) {
    return this.executeUserAction(async () => {
      let allAlbums = []; // Store all albums
      var limit = 50; // Spotify API limit per request
      var offset = 0; // Start from the first album
      var totalAlbums = 0;
      const artist = await this.api.artists.get(artistId);
      console.log("SpotifyHandler: Fetched artist", artist.name);

      do {
        // Fetch artist albums with pagination
        const response = await this.api.artists.albums(
          artistId,
          ["album", "single"],
          null,
          limit,
          offset,
        );

        if (response.items && response.items.length > 0) {
          allAlbums.push(...response.items);
          offset += response.items.length;
        } else {
          break; // Exit if no more items returned
        }

        totalAlbums = response.total;
      } while (offset <= totalAlbums);

      return {
        id: artist.id,
        name: artist.name,
        imageUrl: artist.images[0].url,
        followers: artist.followers.total,
        genres: artist.genres,
        albums: allAlbums,
        type: "artist",
      };
    });
  }

  // Maximum number of items per Spotify API request
  static MAX_BATCH_SIZE = 50;

  // Batch API request wrapper for multiple IDs
  async batchApiRequest(apiMethod, ids) {
    const results = [];
    // Process in batches of MAX_BATCH_SIZE
    for (let i = 0; i < ids.length; i += SpotifyHandler.MAX_BATCH_SIZE) {
      const batchIds = ids.slice(i, i + SpotifyHandler.MAX_BATCH_SIZE);
      const batchResults = await apiMethod(batchIds);
      results.push(...batchResults);
    }
    return results;
  }

  // Wrapper for tracks.get to handle pagination
  async getTracks(trackIds) {
    return this.executeUserAction(async () => {
      return await this.batchApiRequest(
        async (ids) => await this.api.tracks.get(ids),
        trackIds,
      );
    });
  }

  // Wrapper for albums.get to handle pagination
  async getAlbums(albumIds) {
    return this.executeUserAction(async () => {
      return await this.batchApiRequest(
        async (ids) => await this.api.albums.get(ids),
        albumIds,
      );
    });
  }

  // Wrapper for artists.get to handle pagination
  async getArtists(artistIds) {
    return this.executeUserAction(async () => {
      return await this.batchApiRequest(
        async (ids) => await this.api.artists.get(ids),
        artistIds,
      );
    });
  }

  // Search with user context
  async search(query, mediaType, page = 0) {
    return this.executeUserAction(async () => {
      try {
        if (query === "") {
          return [];
        }

        let items = [];
        if (mediaType === "all") {
          const trackItems = await this.api.search(
            query,
            ["track"],
            undefined,
            50,
            page,
          );
          items = trackItems.tracks.items;
        } else if (mediaType === "url") {
          const matches = utils.spotifyUrlRegex.exec(query);
          if (!matches) {
            throw new Error("Invalid Spotify URL");
          }
          const type = matches[1];
          const id = matches[2];

          if (["track", "album", "artist"].includes(type)) {
            items = [await this.api[type + "s"].get(id)];
          } else if (type === "playlist") {
            //items = [await this.getPlaylist(id)];
            //return {"type": "playlist", results: []};
            var playlist = await this.getPlaylist(id);
            console.log(playlist);
            const mappedPlaylist = await this.mapSpotifyResults([playlist]);
            console.log(mappedPlaylist);
            return mappedPlaylist;
          }
        } else if (["track", "album", "artist"].includes(mediaType)) {
          const trackItems = await this.api.search(
            query,
            mediaType,
            null,
            50,
            page * 50,
          );
          items = trackItems[mediaType + "s"].items;
        }

        return await this.mapSpotifyResults(items);
      } catch (error) {
        console.error("Spotify search error:", error);
        return [];
      }
    });
  }

  // Check if user is authenticated
  isUserAuthenticated() {
    return this.userToken != null;
  }

  // Logout user
  logoutUser() {
    this.userToken = null;
  }

  async findItems(selected, username) {
    const found = [];
    var toProcess = [];

    // Group items by type
    const songs = [];
    var albums = [];
    const artists = [];
    const playlists = [];

    selected.forEach((item) => {
      switch (item.type) {
        case "song":
          songs.push(item);
          break;
        case "album":
          albums.push(item);
          break;
        case "artist":
          artists.push(item);
          break;
        case "playlist":
          playlists.push(item);
          break;
        default:
          throw Error("Invalid item type: " + item.type);
      }
    });

    // Batch fetch songs // TODO still needs work
    if (songs.length > 0) {
      const songPromises = songs.map(async (track) => {
        const youtubeInfo = await this.yt.searchSongs(
          `${track.name} ${track.artist}`,
        );
        //console.log(track)
        return {
          title: track.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
          album: track.album.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
          artist: track.artist.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
          albumCoverURL: track.imageUrl,
          artistImageUrl: track.artistImageUrl,
          visibleTo: ["all"],
          inLibrary: [username],
          songs: [
            {
              title: track.name
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, ""),
              url:
                "youtube:" +
                (youtubeInfo[0]?.videoId || youtubeInfo[0]?.browseId || ""),
              trackNumber: track.track_number || 0,
            },
          ],
          type: "song",
        };
      });
      const songResults = await Promise.all(songPromises);
      found.push(...songResults);
    }

    // Batch fetch artists
    if (artists.length > 0) {
      const artistPromises = artists.map(async (artist) => {
        const fullArtist = await this.getFullArtist(artist.id);
        const abums = await this.mapSpotifyResults(fullArtist.albums);
        //console.log("SpotifyHandler: Fetched artist", artist.name, "adding", abums.length, "albums");
        return abums;
      });
      const artistResults = await Promise.all(artistPromises);
      console.log(
        "SpotifyHandler: Fetched artists, adding",
        artistResults[0].length,
        "artist albums",
      );
      artistResults.forEach((aAlbums) => (albums = [albums, ...aAlbums]));
    }
    console.log(
      "SpotifyHandler: going to iterate over",
      albums.length,
      "albums",
    );

    // Batch fetch albums
    if (albums.length > 0) {
      const albumPromises = albums.map(async (album) => {
        const youtubeInfo = await this.yt.searchAlbums(
          `${album.name} ${album.artist}`,
        );

        if (youtubeInfo.length === 0) return null;

        const youtubeAlbum = await this.yt.getAlbum(youtubeInfo[0].albumId);
        console.log("ALBUM: ", album);

        try {
          return {
            title: album.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
            album: album.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
            artist: album.artist
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, ""),
            albumCoverURL: album.imageUrl,
            artistImageUrl: album.artistImageUrl,
            visibleTo: ["all"],
            inLibrary: [username],
            songs: youtubeAlbum.songs.map((x, index) => ({
              title: x.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
              url: "youtube:" + (x.videoId || x.browseId || ""),
              trackNumber: index + 1,
            })),
            type: "album",
          };
        } catch (e) {
          console.log("Error with album", album, e);
          return null;
        }
      });
      const albumResults = await Promise.all(albumPromises);
      found.push(...albumResults.filter((r) => r !== null));
    }

    if (playlists.length > 0) {
      const playlistPromises = playlists.map(async (list) => {
        const playlist = await this.getFullPlaylist(list.id);
        var songPromises = playlist.tracks.map(async (track, index) => {
          const youtubeInfo = await this.yt.searchSongs(
            `${track.name} ${track.artist}`,
          );
          var song = youtubeInfo[0];
          console.log("tarck", track);
          return {
            songPosition: index,
            title: track.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
            album: track.album.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
            artist: track.artist
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, ""),
            albumCoverURL: track.imageUrl,
            artistImageUrl: track.artistImageUrl,
            visibleTo: ["all"],
            inLibrary: [username],
            url: "youtube:" + (song.videoId || song.browseId || ""),
            trackNumber: track.track_number || index + 1,
            type: "song",
          };
        });
        var songResults = await Promise.all(songPromises);
        songResults = songResults.filter((r) => r !== null);
        return {
          id: "spotify:" + playlist.id,
          name: playlist.name,
          owner: playlist.owner,
          imageUrl: playlist.imageUrl,
          ownerImageUrl: playlist.artistImageUrl,
          description: playlist.description,
          isPublic: playlist.isPublic,
          songs: songResults.sort((a, b) => a.songPosition - b.songPosition),
          type: "foundplaylist",
        };
      });
      var playlistResults = await Promise.all(playlistPromises);
      found.push(...playlistResults.filter((r) => r !== null));
    }
    console.log("SpotifyHandler.findItems: Found", found.length, "results");

    return this.mapFoundResults(found, username);
  }

  //async findYoutubeSong(id) {
  //  const track = await this.api.tracks.get(id);
  //  const youtubeInfo = await this.yt.searchSongs(
  //    `${track.name} ${track.artists[0].name}`,
  //  );
  //
  //  return {
  //    title: track.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
  //    album: track.album.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
  //    artist: track.artists[0].name
  //      .normalize("NFD")
  //      .replace(/[\u0300-\u036f]/g, ""),
  //    albumCoverURL: track.album.images[0].url,
  //    songs: [
  //      {
  //        title: track.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
  //        url: "youtube:" + (youtubeInfo[0]?.videoId || youtubeInfo[0]?.browseId || ""),
  //        trackNumber: track.track_number,
  //      },
  //    ],
  //    type: "song",
  //  };
  //}
  //
  //async findYoutubeAlbum(id) {
  //  const album = await this.api.albums.get(id);
  //  const youtubeInfo = await this.yt.searchAlbums(
  //    `${album.name} ${album.artists[0].name}`,
  //  );
  //  console.log(youtubeInfo.length, "youtube results found");
  //
  //  if (youtubeInfo.length === 0) return null;
  //
  //  const youtubeAlbum = await this.yt.getAlbum(youtubeInfo[0].albumId);
  //
  //  return {
  //    title: album.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
  //    album: album.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
  //    artist: album.artists[0].name
  //      .normalize("NFD")
  //      .replace(/[\u0300-\u036f]/g, ""),
  //    albumCoverURL: album.images[0].url,
  //    songs: youtubeAlbum.songs.map((x, index) => ({
  //      title: x.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
  //      url: "youtube:" + (x.videoId || x.browseId || ""),
  //      trackNumber: index + 1,
  //    })),
  //    type: "album",
  //  };
  //}

  async mapSpotifyResults(items) {
    console.log("mapSpotifyResults:", items.length, "items to be mapped");
    var artistIds = items
      .map((item) =>
        item.type != "playlist" ? item.artists?.[0]?.id || "" : "",
      )
      .filter((x) => x != "");
    var artists = [];

    // Use the batched request helper for artists
    if (artistIds.length > 0) {
      artists = await this.getArtists(artistIds);
    }

    artists = artists.map((x) => ({
      id: x.id || "",
      imageUrl: x.images[0].url || "",
    }));
    var mapped = items.map((item) => {
      if (item.type === "track") {
        return {
          id: item.id || "",
          name: item.name || "",
          artist: item.artists?.[0]?.name || "",
          album: item.album?.name || "",
          imageUrl: item.album?.images?.[0]?.url || "",
          artistImageUrl:
            artists.find((x) => x.id == item.artists[0].id)?.imageUrl ||
            "failed",
          trackNumber: item.track_number,
          type: "song",
        };
      } else if (item.type === "album") {
        return {
          id: item.id || "",
          name: item.name || "",
          album: "",
          artist: item.artists[0].name || "",
          imageUrl: item.images[0].url || "",
          artistImageUrl:
            artists.find((x) => x.id == item.artists[0].id)?.imageUrl ||
            "failed",
          type: "album",
        };
      } else if (item.type === "artist") {
        return {
          id: item.id || "",
          name: item.name || "",
          album: "",
          artist: "",
          imageUrl: item.images?.[0]?.url || "",
          artistImageUrl: item.images?.[0]?.url || "",
          type: "artist",
        };
      } else if (item.type === "playlist") {
        console.log(item);
        return {
          id: item.id || "",
          name: item.name || "",
          album: "",
          artist: item.owner.display_name || "",
          imageUrl: item.images[0].url || "",
          artistImageUrl:
            "https://www.tonicradio.fr/wp-content/uploads/2019/05/spotify-1759471_1920.jpg",
          //tracks: item.tracks.map((x) => ({
          //  name: x.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
          //  album: x.album.name
          //    .normalize("NFD")
          //    .replace(/[\u0300-\u036f]/g, ""),
          //  artist: x.artists[0].name
          //    .normalize("NFD")
          //    .replace(/[\u0300-\u036f]/g, ""),
          //  imageUrl: x.album.images[0].url,
          //  type: "song",
          //})),
          type: "playlist",
        };
      }
      return item;
    });
    return mapped;
  }

  // THIS IS WHERE YOU REFORMAT THE FINAL RESULTS
  mapFoundResults(found, user) {
    return found.map((x) => {
      console.log("SpotifyHandler.mapFoundResults: Found item", x);
      if (x.type == "foundplaylist") {
        x.type = "playlist";
        x.visibleTo = ["all"];
        x.inLibrary = x.inLibrary || [user];
        return x;
      }
      return {
        name: x.title || x.name || "",
        album: x.album || "",
        artist: x.artist || "",
        imageUrl: x.albumCoverURL || x.playlistCoverURL || "",
        artistImageUrl: x.artistImageUrl || "failed",
        visibleTo: ["all"],
        inLibrary: x.inLibrary || [user],
        type: x.type,
        songs: x.songs || [],
      };
    });
  }

  // Helper method to check if token is expired or about to expire
  isTokenExpired() {
    if (!this.tokenExpirationTime) return true;
    // Consider token expired if it's within 5 minutes of expiration
    return Date.now() >= this.tokenExpirationTime - 300000;
  }
}

export default SpotifyHandler;
