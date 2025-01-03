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
    this.pendingStates.set(state, userId);

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

      this.pendingStates.delete(state);

      // Initialize API instance for this user
      await this.initializeUserApi("main");

      return "main";
    } catch (error) {
      console.error("Error handling callback:", error);
      throw error;
    }
  }

  // Initialize or refresh API instance for a specific user
  async initializeUserApi(userId) {
    console.log(this.userToken);
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
  async refreshUserToken(userId) {
    const userToken = this.userToken;
    if (!userToken) {
      throw new Error("User not authenticated");
    }

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
          grant_type: "refresh_token",
          refresh_token: userToken.refreshToken,
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

      await this.initializeUserApi(userId);
    } catch (error) {
      console.error("Error refreshing user token:", error);
      throw error;
    }
  }

  // Execute API call with automatic token refresh
  async executeUserAction(userId, apiCall) {
    try {
      const userToken = this.userToken;
      if (!userToken) {
        throw new Error("User not authenticated");
      }

      // Check if token is expired or about to expire
      if (Date.now() >= userToken.expirationTime - 60000) {
        await this.refreshUserToken(userId);
      }

      await this.initializeUserApi(userId);
      return await apiCall();
    } catch (error) {
      if (error.status === 401) {
        await this.refreshUserToken(userId);
        return await apiCall();
      }
      throw error;
    }
  }

  // Get user's profile
  async getUserProfile() {
    return this.executeUserAction(this.userToken, async () => {
      return await this.api.currentUser.profile();
    });
  }

  // Get user's playlists
  async getUserPlaylists() {
    return this.executeUserAction(this.userToken, async () => {
      return await this.api.currentUser.playlists.playlists();
    });
  }

  async getFullPlaylist(playlistId) {
    return this.executeUserAction(this.userToken, async () => {
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
        const response = await this.api.playlists.getPlaylistItems(playlistId, null, null, limit, offset);
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

  // Search with user context
  async search(userId, query, mediaType, page = 0) {
    return this.executeUserAction(userId, async () => {
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
            const playlist = await this.getFullPlaylist(id);
            console.log(JSON.stringify(playlist,null,2));
            return { type: "playlist", items: [playlist] };
          }
        } else {
          const results = await this.api.search(
            query,
            [mediaType],
            undefined,
            50,
            page,
          );
          items = results[mediaType + "s"].items;
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

  async findItems(selected) {
    return this.executeWithRetry(async () => {
      const found = [];

      for (const x of selected) {
        try {
          let result = {};
          const url = `https://open.spotify.com/${x.type === "song" ? "track" : x.type}/${x.id}`;

          switch (x.type) {
            case "song":
              result = await this.findSong(x.id);
              break;
            case "album":
              result = await this.findAlbum(x.id);
              break;
            case "playlist":
              // Not implemented
              break;
            default:
              break;
          }
          if (result) {
            found.push(result);
          }
        } catch (error) {
          console.error(`Error finding item ${x.id}:`, error);
        }
      }

      await waitUntil(() => found.length === selected.length, {
        timeout: Number.POSITIVE_INFINITY,
      });

      return this.mapFoundResults(found);
    });
  }

  async findSong(id) {
    return this.executeWithRetry(async () => {
      const track = await this.api.tracks.get(id);
      const youtubeInfo = await this.yt.searchSongs(
        `${track.name} ${track.artists[0].name}`,
      );

      return {
        title: track.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
        album: track.album.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, ""),
        artist: track.artists[0].name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, ""),
        albumCoverURL: track.album.images[0].url,
        songs: [
          {
            title: track.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
            id: youtubeInfo[0]?.videoId || youtubeInfo[0]?.browseId || "",
            trackNumber: track.track_number,
          },
        ],
        type: "song",
      };
    });
  }

  async findAlbum(id) {
    return this.executeWithRetry(async () => {
      const album = await this.api.albums.get(id);
      const youtubeInfo = await this.yt.searchAlbums(
        `${album.name} ${album.artists[0].name}`,
      );

      if (youtubeInfo.length === 0) return null;

      const youtubeAlbum = await this.yt.getAlbum(youtubeInfo[0].albumId);

      return {
        title: album.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
        album: album.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
        artist: album.artists[0].name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, ""),
        albumCoverURL: album.images[0].url,
        songs: youtubeAlbum.songs.map((x, index) => ({
          title: x.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
          id: x.videoId || x.browseId || "",
          trackNumber: index + 1,
        })),
        type: "album",
      };
    });
  }

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
          artist: item.artists?.[0]?.name || "",
          imageUrl: item.images?.[0]?.url || "",
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
      }
      return item;
    });
  }

  mapFoundResults(found) {
    return found.map((x) => ({
      name: x.title || x.name || "",
      album: x.album || "",
      artist: x.artist || "",
      imageUrl: x.albumCoverURL || x.playlistCoverURL || "",
      type: x.type,
      songs: x.songs || [],
    }));
  }

  // Helper method to check if token is expired or about to expire
  isTokenExpired() {
    if (!this.tokenExpirationTime) return true;
    // Consider token expired if it's within 5 minutes of expiration
    return Date.now() >= this.tokenExpirationTime - 300000;
  }
}

export default SpotifyHandler;
