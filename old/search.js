const clientID = "0a65ebdec6ec4983870a7d2f51af2aa1";
const secretKey = "22714014e04f46cebad7e03764beeac8";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const { SpotifyApi } = require("@spotify/web-api-ts-sdk");

(async () => {
    const api = SpotifyApi.withClientCredentials(
        clientID,
        secretKey
    );
    
    const items = await api.search("artist:'Virtual Riot'", ["track"]);
    
    console.table(items.tracks.items.map((item) => ({
        name: item.name,
        // followers: item.followers.total,
        popularity: item.popularity,
        id: item.id
    })));
    console.log(items.tracks.items[0]);
})();
