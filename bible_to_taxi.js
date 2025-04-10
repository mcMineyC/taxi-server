import fs from "fs/promises";
import path from "path";

import { fileURLToPath } from "url";
// Define __dirname since it's not available in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function transformBibleData(edition) {
  if (!edition) {
    throw new Error("Edition is required");
  }
  try {
    // Load the ESV URLs data
    const esvData = await fs.readFile(
      edition.toLowerCase() + "_urls.json",
      "utf8",
    );
    const esvUrls = JSON.parse(esvData);

    // Create containers for our transformed data
    const songs = [];
    const albums = {};
    const artists = {};

    // Use a fixed user for adding content
    const addedBy = "jedi";
    const currentTime = Date.now();
    var name = edition + " Bible";

    // Create a single artist for all Bible content
    const artistId = name.replace(/\s+/g, "_").toLowerCase();
    const artist = {
      id: artistId,
      added: currentTime,
      addedBy: addedBy,
      albumCount: 0,
      displayName: name,
      imageUrl:
        "https://dch8lckz6x8ar.cloudfront.net/static/img/apple-touch-icon.a1ed3d10db96.png",
      inLibrary: [addedBy],
      songCount: 0,
      visibleTo: ["all"],
    };
    artists[artistId] = artist;

    // Create albums by book
    esvUrls.forEach((entry) => {
      const bookName = entry.book;
      const albumId = `${artistId}_${bookName.replace(/\s+/g, "_").toLowerCase()}`;

      // Create album if it doesn't exist yet
      if (!albums[albumId]) {
        albums[albumId] = {
          id: albumId,
          added: currentTime,
          addedBy: addedBy,
          artistDisplayName: artist.displayName,
          artistId: artistId,
          displayName: bookName,
          imageUrl:
            "https://dch8lckz6x8ar.cloudfront.net/static/img/apple-touch-icon.a1ed3d10db96.png",
          inLibrary: [],
          songCount: 0,
          visibleTo: ["all"],
        };
        artist.albumCount++;
      }

      // Create song
      const songId = `${albumId}_${entry.chapter}`;
      const song = {
        id: songId,
        added: currentTime,
        addedBy: addedBy,
        albumDisplayName: bookName,
        albumId: albumId,
        artistDisplayName: artist.displayName,
        artistId: artistId,
        audioUrl: entry.url,
        displayName: `${bookName} ${entry.chapter}`,
        duration: 0, // We don't have duration info
        imageUrl:
          "https://dch8lckz6x8ar.cloudfront.net/static/img/apple-touch-icon.a1ed3d10db96.png",
        inLibrary: [],
        trackNumber: entry.chapter,
        visibleTo: ["all"],
      };

      songs.push(song);
      albums[albumId].songCount++;
      artist.songCount++;
    });

    // Convert collections to arrays for final output
    const albumsArray = Object.values(albums);

    // Save the transformed data
    const transformedData = {
      songs: songs,
      albums: albumsArray,
      artists: [artist],
    };

    await fs.writeFile(
      name.split(" ")[0].toLowerCase() + "_readyToUse.json",
      JSON.stringify(transformedData, null, 2),
    );

    console.log(
      `Transformed ${songs.length} songs across ${albumsArray.length} albums`,
    );
  } catch (error) {
    console.error("Error transforming ESV data:", error);
  }
}

// Dictionary to map abbreviated book names to full names
const bookNameMapping = {
  Gen: "Genesis",
  Exod: "Exodus",
  Lev: "Leviticus",
  Num: "Numbers",
  Deut: "Deuteronomy",
  Josh: "Joshua",
  Judg: "Judges",
  Ruth: "Ruth",
  "1Sam": "I Samuel",
  "2Sam": "II Samuel",
  "1Kgs": "I Kings",
  "2Kgs": "II Kings",
  "1Chr": "I Chronicles",
  "2Chr": "II Chronicles",
  Ezra: "Ezra",
  Neh: "Nehemiah",
  Esth: "Esther",
  Job: "Job",
  Ps: "Psalms",
  Prov: "Proverbs",
  Eccl: "Ecclesiastes",
  Song: "Song of Solomon",
  Isa: "Isaiah",
  Jer: "Jeremiah",
  Lam: "Lamentations",
  Ezek: "Ezekiel",
  Dan: "Daniel",
  Hos: "Hosea",
  Joel: "Joel",
  Amos: "Amos",
  Obad: "Obadiah",
  Jonah: "Jonah",
  Mic: "Micah",
  Nah: "Nahum",
  Hab: "Habakkuk",
  Zeph: "Zephaniah",
  Hag: "Haggai",
  Zech: "Zechariah",
  Mal: "Malachi",
  Matt: "Matthew",
  Mark: "Mark",
  Luke: "Luke",
  John: "John",
  Acts: "Acts",
  Rom: "Romans",
  "1Cor": "I Corinthians",
  "2Cor": "II Corinthians",
  Gal: "Galatians",
  Eph: "Ephesians",
  Phil: "Philippians",
  Col: "Colossians",
  "1Thess": "I Thessalonians",
  "2Thess": "II Thessalonians",
  "1Tim": "I Timothy",
  "2Tim": "II Timothy",
  Titus: "Titus",
  Phlm: "Philemon",
  Heb: "Hebrews",
  Jas: "James",
  "1Pet": "I Peter",
  "2Pet": "II Peter",
  "1John": "I John",
  "2John": "II John",
  "3John": "III John",
  Jude: "Jude",
  Rev: "Revelation",
};

// Function to get the book number based on its position in the Bible
function getBookNumber(bookName) {
  const bookNumbers = {
    Genesis: "01",
    Exodus: "02",
    Leviticus: "03",
    Numbers: "04",
    Deuteronomy: "05",
    Joshua: "06",
    Judges: "07",
    Ruth: "08",
    "I Samuel": "09",
    "II Samuel": "10",
    "I Kings": "11",
    "II Kings": "12",
    "I Chronicles": "13",
    "II Chronicles": "14",
    Ezra: "15",
    Nehemiah: "16",
    Esther: "17",
    Job: "18",
    Psalms: "19",
    Proverbs: "20",
    Ecclesiastes: "21",
    "Song of Solomon": "22",
    Isaiah: "23",
    Jeremiah: "24",
    Lamentations: "25",
    Ezekiel: "26",
    Daniel: "27",
    Hosea: "28",
    Joel: "29",
    Amos: "30",
    Obadiah: "31",
    Jonah: "32",
    Micah: "33",
    Nahum: "34",
    Habakkuk: "35",
    Zephaniah: "36",
    Haggai: "37",
    Zechariah: "38",
    Malachi: "39",
    Matthew: "40",
    Mark: "41",
    Luke: "42",
    John: "43",
    Acts: "44",
    Romans: "45",
    "I Corinthians": "46",
    "II Corinthians": "47",
    Galatians: "48",
    Ephesians: "49",
    Philippians: "50",
    Colossians: "51",
    "I Thessalonians": "52",
    "II Thessalonians": "53",
    "I Timothy": "54",
    "II Timothy": "55",
    Titus: "56",
    Philemon: "57",
    Hebrews: "58",
    James: "59",
    "I Peter": "60",
    "II Peter": "61",
    "I John": "62",
    "II John": "63",
    "III John": "64",
    Jude: "65",
    Revelation: "66",
  };
  return bookNumbers[bookName] || "00";
}

async function transformNivToEsvFormat() {
  try {
    // Load the NIV JSON data
    const nivData = JSON.parse(
      await fs.readFile(path.join(__dirname, "niv.json"), "utf8"),
    );

    // // Load the ESV JSON data (just for reference - not actually used in the transformation)
    // const esvData = JSON.parse(
    //   await fs.readFile(path.join(__dirname, "esv_urls.json"), "utf8"),
    // );

    // Initialize the transformed data array
    const transformedData = [];

    // Process each NIV entry
    for (const [key, url] of Object.entries(nivData)) {
      // Extract book abbreviation and chapter using regex
      const match = key.match(/([a-zA-Z0-9]+)\.(\d+)/);

      if (match) {
        const bookAbbr = match[1];
        const chapter = match[2];

        // Convert to full book name
        const bookFull = bookNameMapping[bookAbbr] || bookAbbr;

        // Create a display name
        const nameDisplay = `${bookFull} ${chapter}`;

        // Get book number for filename
        const bookNum = getBookNumber(bookFull);

        // Form the filename (matching ESV pattern)
        const underscoreBook = bookFull.replace(/ /g, "_");
        const filename = `./audio/${bookNum}_${underscoreBook}-${chapter}.mp3`;

        // Create an entry in the new format
        const entry = {
          url: url,
          name: nameDisplay,
          book: bookFull,
          chapter: parseInt(chapter),
          filename: filename,
        };

        transformedData.push(entry);
      }
    }

    // Sort the transformed data by book and chapter
    transformedData.sort((a, b) => {
      const bookNumA = getBookNumber(a.book);
      const bookNumB = getBookNumber(b.book);

      if (bookNumA !== bookNumB) {
        return bookNumA.localeCompare(bookNumB);
      }
      return a.chapter - b.chapter;
    });

    // Write the transformed data to a file
    await fs.writeFile(
      path.join(__dirname, "niv_urls.json"),
      JSON.stringify(transformedData, null, 2),
    );

    console.log(
      `Transformation complete. ${transformedData.length} entries processed.`,
    );
  } catch (error) {
    console.error("Error transforming NIV data:", error);
  }
}

// Execute the transformation function
await transformNivToEsvFormat();
await transformBibleData("ESV");
await transformBibleData("NIV");
