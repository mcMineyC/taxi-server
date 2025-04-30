import kusc from "kusc_api"
console.log(await kusc.getStreamUrl("KUSCc"));
console.log((await kusc.getCurrentMetadata("KUSC")).summary);
