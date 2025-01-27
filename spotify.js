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
        description: playlist.description,
        isPublic: playlist.public,
        tracks: allTracks,
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
            items = [await this.getFullPlaylist(id)];
            //const mappedPlaylist = this.mapSpotifyResults([playlist]);
            //console.log(JSON.stringify(mappedPlaylist, null, 2));
            //return { type: "playlist", results: [mappedPlaylist] };
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

        return this.mapSpotifyResults(items);
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

    // Group items by type
    const songs = [];
    var albums = [];
    const artists = [];

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
      }
    });

    // Batch fetch songs // TODO still needs work
    if (songs.length > 0) {
      const songPromises = songs.map(async (track) => {
        const youtubeInfo = await this.yt.searchSongs(
          `${track.name} ${track.artist}`,
        );
        console.log(track)
        return {
          title: track.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
          album: track.album
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, ""),
          artist: track.artist
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, ""),
          albumCoverURL: track.imageUrl,
          visibleTo: username,
          songs: [
            {
              title: track.name
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, ""),
              url: "youtube:" + (youtubeInfo[0]?.videoId || youtubeInfo[0]?.browseId || ""),
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
        const abums = this.mapSpotifyResults(fullArtist.albums);
        console.log("SpotifyHandler: Fetched artist", artist.name, "adding", abums.length, "albums");
        return abums;
      });
      const artistResults = await Promise.all(artistPromises);
      console.log("SpotifyHandler: Fetched artists, adding", artistResults[0].length, "artist albums");
      artistResults.forEach((aAlbums) => albums = [albums, ...aAlbums]);
    }
    console.log("SpotifyHandler: going to iterate over", albums.length, "albums");

    // Batch fetch albums
    if (albums.length > 0) {
      const albumPromises = albums.map(async (album) => {
        const youtubeInfo = await this.yt.searchAlbums(
          `${album.name} ${album.artist}`,
        );

        if (youtubeInfo.length === 0) return null;

        const youtubeAlbum = await this.yt.getAlbum(youtubeInfo[0].albumId);
        console.log("ALBUM: ",album)

        try{
          return {
            title: album.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
            album: album.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
            artist: album.artist
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, ""),
            albumCoverURL: album.imageUrl,
            visibleTo: username,
            songs: youtubeAlbum.songs.map((x, index) => ({
              title: x.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
              url: "youtube:" + (x.videoId || x.browseId || ""),
              trackNumber: index + 1,
            })),
            type: "album",
          };
        }catch(e){
          console.log("Error with album", album, e);
          return null;
        }
      });
      const albumResults = await Promise.all(albumPromises);
      found.push(...albumResults.filter((r) => r !== null));
    }


    return this.mapFoundResults(found);
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

  mapSpotifyResults(items) {
    return items.map((item) => {
      if (item.type === "track") {
        return {
          id: item.id || "",
          name: item.name || "",
          artist: item.artists?.[0]?.name || "",
          album: item.album?.name || "",
          imageUrl: item.album?.images?.[0]?.url || "",
          type: "song",
        };
      } else if (item.type === "album") {
        return {
          id: item.id || "",
          name: item.name || "",
          album: "",
          artist: item.artists[0].name || "",
          imageUrl: item.images[0].url || "",
          type: "album",
        };
      } else if (item.type === "artist") {
        return {
          id: item.id || "",
          name: item.name || "",
          album: "",
          artist: "",
          imageUrl: item.images?.[0]?.url || "",
          type: "artist",
        };
      } else if (item.type === "playlist") {
        return {
          id: item.id || "",
          name: item.name || "",
          album: "",
          artist: item.owner,
          imageUrl: item.imageUrl || "",
          tracks: item.tracks.map((x) => ({
            name: x.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
            album: x.album.name
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, ""),
            artist: x.artists[0].name
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, ""),
            imageUrl: x.album.images[0].url,
            type: "song",
          })),
          type: "playlist",
        };
      }
      return item;
    });
  }

  mapFoundResults(found) {
    return found.map((x) => {
      console.log("Found item", x);
      return {
        name: x.title || x.name || "",
        album: x.album || "",
        artist: x.artist || "",
        imageUrl: x.albumCoverURL || x.playlistCoverURL || "",
        type: x.type,
        songs: (x.songs || [])
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
