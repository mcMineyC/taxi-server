import fs from "fs";
import path from "path";
import dbCon from "./db.js";
const db = dbCon.db("taxi");
// Check if the default filename is being used
if (!process.argv[2]) {
  throw new Error("No filename provided.  Usage: node restore.js <filename>");
}
// Get filename from command line arguments, default to "./esv_readyToUse.json" if not provided
const filename = process.argv[2];

try {
  // Check if file exists
  if (!fs.existsSync(filename)) {
    throw new Error(`File not found: ${filename}`);
  }

  console.log(`Importing data from ${filename}`);
  const rawData = fs.readFileSync(filename, "utf8");
  const data = JSON.parse(rawData);

  // Validate file structure
  if (!data.songs || !Array.isArray(data.songs)) {
    throw new Error("Invalid file structure: 'songs' array is missing");
  }
  if (!data.albums || !Array.isArray(data.albums)) {
    throw new Error("Invalid file structure: 'albums' array is missing");
  }
  if (!data.artists || !Array.isArray(data.artists)) {
    throw new Error("Invalid file structure: 'artists' array is missing");
  }

  console.log(
    `Found ${data.songs.length} songs, ${data.albums.length} albums, and ${data.artists.length} artists`,
  );

  // Upsert data into collections
  await db
    .collection("songs")
    .bulkWrite(
      data.songs.map((song) => ({
        updateOne: {
          filter: { _id: song._id },
          update: { $set: song },
          upsert: true,
        },
      })),
    );
  await db
    .collection("albums")
    .bulkWrite(
      data.albums.map((album) => ({
        updateOne: {
          filter: { _id: album._id },
          update: { $set: album },
          upsert: true,
        },
      })),
    );
  await db
    .collection("artists")
    .bulkWrite(
      data.artists.map((artist) => ({
        updateOne: {
          filter: { _id: artist._id },
          update: { $set: artist },
          upsert: true,
        },
      })),
    );

  await dbCon.close();
  console.log("Data import completed successfully");
} catch (error) {
  console.error(`Error: ${error.message}`);
  await dbCon.close();
  process.exit(1);
}
