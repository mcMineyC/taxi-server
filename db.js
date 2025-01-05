// Just some crazy stuff I found in a Stack Overflow
import { createRequire } from "module";
const require = createRequire(import.meta.url);

import schemas from "./schemas.js";

const { createRxDatabase, addRxPlugin } = require("rxdb");
import { getRxStorageMongoDB } from "rxdb/plugins/storage-mongodb";
import { RxDBJsonDumpPlugin } from "rxdb/plugins/json-dump";
import { RxDBMigrationSchemaPlugin } from "rxdb/plugins/migration-schema";
addRxPlugin(RxDBMigrationSchemaPlugin);
addRxPlugin(RxDBJsonDumpPlugin);

var dbName = "rxdb-taxi";
const debounceTime = 2000; // 2 seconds wait for batched operations

var db = await createRxDatabase({
  name: dbName,
  storage: getRxStorageMongoDB({
    connection:
      "mongodb://admin:supersecure123@192.168.30.36:27017/?authSource=admin",
  }),
});
await schemas.register(db, 9);
// console.log("Registered schemas");

function setupChangeListeners(db) {
  let songUpdateTimer = null;
  let albumUpdateTimer = null;
  let pendingSongChanges = new Set();
  let pendingAlbumChanges = new Set();

  // Song changes listener with debouncing
  db.songs.$.subscribe(async (changeEvent) => {
    const affectedAlbums = new Set();
    const affectedArtists = new Set();

    // Collect affected IDs from this batch of changes
    for (const change of changeEvent.changes) {
      if (change.operation === "INSERT" || change.operation === "DELETE") {
        if (change.doc) {
          affectedAlbums.add(change.doc.albumId);
          affectedArtists.add(change.doc.artistId);
        }
      }
    }

    // Add to pending changes
    affectedAlbums.forEach((id) => pendingSongChanges.add(id));
    affectedArtists.forEach((id) => pendingSongChanges.add(id));

    // Clear existing timer
    if (songUpdateTimer) {
      clearTimeout(songUpdateTimer);
    }

    // Set new timer
    songUpdateTimer = setTimeout(async () => {
      try {
        console.log("Processing batched song changes...");
        const uniqueAlbums = new Set();
        const uniqueArtists = new Set();

        // Split pending changes into albums and artists
        pendingSongChanges.forEach((id) => {
          if (id.includes("_")) {
            // Album ID format check
            uniqueAlbums.add(id);
          } else {
            uniqueArtists.add(id);
          }
        });

        // Update album song counts
        const albumUpdates = Array.from(uniqueAlbums).map(async (albumId) => {
          const songCount = await db.songs
            .count({
              selector: { albumId },
            })
            .exec();

          const album = await db.albums
            .findOne({
              selector: { id: albumId },
            })
            .exec();

          if (album) {
            await album.atomicPatch({ songCount });
            console.log(
              `Updated album ${album.displayName}: ${songCount} songs`,
            );
          }
        });

        // Update artist counts
        const artistUpdates = Array.from(uniqueArtists).map(
          async (artistId) => {
            const [songCount, albumCount] = await Promise.all([
              db.songs
                .count({
                  selector: { artistId },
                })
                .exec(),
              db.albums
                .count({
                  selector: { artistId },
                })
                .exec(),
            ]);

            const artist = await db.artists
              .findOne({
                selector: { id: artistId },
              })
              .exec();

            if (artist) {
              await artist.atomicPatch({
                songCount,
                albumCount,
              });
              console.log(
                `Updated artist ${artist.displayName}: ${songCount} songs, ${albumCount} albums`,
              );
            }
          },
        );

        // Wait for all updates to complete
        await Promise.all([...albumUpdates, ...artistUpdates]);
        console.log("Batch song updates completed");

        // Clear pending changes
        pendingSongChanges.clear();
      } catch (error) {
        console.error("Error processing batched song changes:", error);
      }
    }, debounceTime);
  });

  // Album changes listener with debouncing
  db.albums.$.subscribe(async (changeEvent) => {
    const affectedArtists = new Set();

    for (const change of changeEvent.changes) {
      if (change.operation === "INSERT" || change.operation === "DELETE") {
        if (change.doc) {
          affectedArtists.add(change.doc.artistId);
        }
      }
    }

    // Add to pending changes
    affectedArtists.forEach((id) => pendingAlbumChanges.add(id));

    // Clear existing timer
    if (albumUpdateTimer) {
      clearTimeout(albumUpdateTimer);
    }

    // Set new timer
    albumUpdateTimer = setTimeout(async () => {
      try {
        console.log("Processing batched album changes...");

        // Update artist album counts
        const artistUpdates = Array.from(pendingAlbumChanges).map(
          async (artistId) => {
            const [songCount, albumCount] = await Promise.all([
              db.songs
                .count({
                  selector: { artistId },
                })
                .exec(),
              db.albums
                .count({
                  selector: { artistId },
                })
                .exec(),
            ]);

            const artist = await db.artists
              .findOne({
                selector: { id: artistId },
              })
              .exec();

            if (artist) {
              await artist.atomicPatch({
                songCount,
                albumCount,
              });
              console.log(
                `Updated artist ${artist.displayName}: ${songCount} songs, ${albumCount} albums`,
              );
            }
          },
        );

        // Wait for all updates to complete
        await Promise.all(artistUpdates);
        console.log("Batch album updates completed");

        // Clear pending changes
        pendingAlbumChanges.clear();
      } catch (error) {
        console.error("Error processing batched album changes:", error);
      }
    }, debounceTime);
  });
}

// Optional: Add a way to force immediate processing of pending changes
async function forceProcessPendingChanges(db) {
  if (songUpdateTimer) {
    clearTimeout(songUpdateTimer);
    songUpdateTimer = null;
  }
  if (albumUpdateTimer) {
    clearTimeout(albumUpdateTimer);
    albumUpdateTimer = null;
  }

  // Trigger the update functions immediately
  await Promise.all([
    processSongChanges(db, pendingSongChanges),
    processAlbumChanges(db, pendingAlbumChanges),
  ]);
}

export default db;
export { forceProcessPendingChanges };
