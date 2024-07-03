var tmpl = combyne("" +
"    <div>" + "\n" +
"        <h1>{{artist}}</h1>" + "\n" +
"        <ul>" + "\n" +
"            <li>{{album}}</li>" + "\n" +
"            <ul>" + "\n" +
"                <li>{{title}} - {{file}}</li>" + "\n" +
"            </ul>" + "\n" +
"        </ul>" + "\n" +
"    </div>" + "\n"
);
axios.get('/info/songs')
    .then(function (response) {
        var data = response.data;
        for (var artist in JSON.parse(JSON.stringify(response.data))) {
            artist = data[artist];
            console.log(artist["displayName"]); //artist
            document.getElementById("root").innerHTML += "<h1>" + artist["displayName"] + "</h1>" + "\n";
            for (var album in artist["albums"]) {
                var album = artist["albums"][album];
                console.log("\t" + album["displayName"]); //album
                var songstr = "";
                Object.entries(album["songs"]).forEach((song) => {
                    var [key, v] = song;
                    console.log("\t\t" + v["title"] + ": " + v["file"] + ""); //song
                    songstr += "<li>" + v["title"] + " - " + v["file"] + "</li>" + "\n";
                    // document.getElementById("root").innerHTML += tmpl.render({artist: artist["displayName"], album: album["displayName"], title: v["title"], file: v["file"]});
                });
                document.getElementById("root").innerHTML += "<ul><li>" + album["displayName"] + "</li><ul>" + songstr + "\n";
            }
        }
                
    })
    .catch(function (error){
        console.log(error);
    })