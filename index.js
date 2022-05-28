const fs = require('fs');
const YoutubeMp3Downloader = require("youtube-mp3-downloader");
const ytfps = require('ytfps');
const readline = require("readline");
const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');
const request = require('request');

const downloadFile = function(uri, filename, callback){
  request.head(uri, function(err, res, body){    
    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  });
};


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let playlistLength = 0;
let downloadedMusics = 0;

function setArtworkImage(image, file){
    let albumCover = image;
    let path = `./Music/${file}`;
    let tempPath = `./Music/temp/${file.split('.')[0]}.temp.mp3`;
    let strm = ffmpeg(path).addOutputOptions('-i', albumCover, '-map', '0:0', '-map', '1:0', '-c', 'copy', '-id3v2_version', '3').save(tempPath);
    strm.on('end', () => {
        fs.unlinkSync(path);
        fs.renameSync(tempPath, path);
        fs.unlinkSync(albumCover);
    });
}

function downloadPlaylistMusics(urlID){
    const url = urlID;

    if(urlID.includes("youtube.com") && urlID.includes("v=")){
        url = url.split("list=");

        if(url[1].includes("&")){
            url = url[1].split("&");
            url = url[0];
        }else{
            url = url[1];
        }
    }

    var YD = new YoutubeMp3Downloader({
        "ffmpegPath": ffmpegPath,  // FFmpeg binary location
        "outputPath": "./Music",    
        "youtubeVideoQuality": "highestaudio", 
        "queueParallelism": 2,
        "progressTimeout": 2000,
        "allowWebm": false      
    });

    YD.on("finished", async function(err, data_link) {
        downloadedMusics++;
        let mp3Path = data_link.videoTitle;
        if(!fs.existsSync(`./Music/${mp3Path}.mp3`) && fs.existsSync(`./Music/${data_link.title}.mp3`)) {
            mp3Path = data_link.title;
        }

        downloadFile(`https://i.ytimg.com/vi/${data_link.videoId}/hqdefault.jpg`, `./Music/images/${data_link.videoId}.jpg`, () =>{
                setArtworkImage(`./Music/images/${data_link.videoId}.jpg`, `${mp3Path}.mp3`);
        });
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(`\r${data_link.title} [Downloaded] | ${downloadedMusics} of ${playlistLength} downloaded!`);

    });
    YD.on("error", function(error) {
        console.log(`${error}`);
    });

    ytfps(url).then(async list =>{
        const pl_videos = await list.videos;
        playlistLength = pl_videos.length;
        let index = 0;

        console.log(`Downloading ${playlistLength} musics...`);

        pl_videos.forEach(async video => {

            let id_video = video.id;
            let isLast = false;

            if(index == playlistLength - 1)
                isLast = true;
            
            index++;
            if (fs.existsSync(`./Music/${video.title}.mp3`)) {
                downloadedMusics++;
                console.log(`Music ${video.title}.mp3 already exists!`);
                return;
            }
            downloadMusic(YD, id_video, isLast);
        });

    });
}


function downloadMusic(YD, urlID, isLast = false){
    let id_video = urlID;
    if(urlID.includes("youtube.com") && urlID.includes("v=")){
        id_video = id_video.split("v=");

        if(id_video[1].includes("&")){
            id_video = id_video[1].split("&");
            id_video = id_video[0];
        }else{
            id_video = id_video[1];
        }
    }else if(urlID.includes("youtu.be")){
        id_video = id_video.split(".be/");
        if(id_video[1].includes("?")){
            id_video = id_video[1].split("?");
            id_video = id_video[0];
        }else{
            id_video = id_video[1];
        }
    }

    YD.download(id_video);

    if(isLast){
        YD.on("finished", async function(err, data_link) {
            rl.close();
        });
    }
}


rl.question('Hello!\n\rDownload music (m) or playlist (p)? ', (answer) => {
    
    if(answer == 'p'){
        rl.question('Insert playlist ID or playlist LINK: ', answer => {
            console.log("Please wait...");
            downloadPlaylistMusics(answer);
        });
    }else if('m'){
        rl.question('Insert music ID or youtube LINK: ', answer => {
            console.log("Please wait...");
            var YD = new YoutubeMp3Downloader({
                "ffmpegPath": ffmpegPath,  // FFmpeg binary location
                "outputPath": "./Music",    
                "youtubeVideoQuality": "highestaudio", 
                "queueParallelism": 2,
                "progressTimeout": 2000,
                "allowWebm": false      
            });
            downloadMusic(YD, answer, true);
        });
    }else{
        rl.close();
    }
});
