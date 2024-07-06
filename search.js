import { createRequire } from "module";
const require = createRequire(import.meta.url);

const { SpotifyApi } = require("@spotify/web-api-ts-sdk");
const clientID = "0a65ebdec6ec4983870a7d2f51af2aa1";
const secretKey = "22714014e04f46cebad7e03764beeac8";

const api = SpotifyApi.withClientCredentials(
  clientID,
  secretKey
);

function stringToDate(_date,_format,_delimiter)
{
            var formatLowerCase=_format.toLowerCase();
            var formatItems=formatLowerCase.split(_delimiter);
            var dateItems=_date.split(_delimiter);
            var monthIndex=formatItems.indexOf("mm");
            var dayIndex=formatItems.indexOf("dd");
            var yearIndex=formatItems.indexOf("yyyy");
            var month=parseInt(dateItems[monthIndex]);
            month-=1;
            var formatedDate = new Date(dateItems[yearIndex],month,dateItems[dayIndex]);
  } 

var continu = true;
var items = [];
var offset = 0
while(continu){
  var res = await api.artists.albums("0LzeyDrlLtuyBqMSBN4z3U", undefined, undefined, 50, offset);
  items = items.concat(res.items);
  offset += 50;
  if(!res.next) continu = false;
}
items.map((item) => {
  if(item.release_date_precision != "day") item.release_date = item.release_date.substring(0,4) + "-01-01"
  return item
})
items.sort((a, b) => new Date(b.release_date) - new Date(a.release_date))
console.table(items.map((item) => ({
  name: item.name,
  type: item.album_type,
  releaseDate: item.release_date,
})));

