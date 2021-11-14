var SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
const synth = window.speechSynthesis;

const recognition = new SpeechRecognition();
const icon = document.querySelector('i.fa.fa-microphone');

URL = window.URL || window.webkitURL;
var gumStream;
var rec;
var input;
var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext = new AudioContext;
var recordButton = document.getElementById("startButton");
var stopButton = document.getElementById("stopButton");
recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);

var constraints = {
    audio: true,
    video: false
} 

recordButton.disabled = true;
stopButton.disabled = false;


navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
    console.log("getUserMedia() success, stream created, initializing Recorder.js ..."); 
    gumStream = stream;
    input = audioContext.createMediaStreamSource(stream);
    rec = new Recorder(input, {
        numChannels: 1
    }) 
    rec.record()
    console.log("Recording started");
}).catch(function(err) {
    recordButton.disabled = false;
    stopButton.disabled = true;
    pauseButton.disabled = true
});

function startRecording() { console.log("recordButton clicked"); stopButton.disabled = false;}

function stopRecording() {
    console.log("stopButton clicked");
    stopButton.disabled = true;
    recordButton.disabled = false;
    rec.stop();
    console.log(rec)
    gumStream.getAudioTracks()[0].stop();
    rec.exportWAV(createDownloadLink);
}
 

function createDownloadLink(blob) {
    console.log(blob)
    url = URL.createObjectURL(blob);
    recordingsList = document.getElementById("recordingsList")
    var au = document.createElement('audio');
    var li = document.createElement('li');
    var link = document.createElement('a');
    //add controls to the <audio> element 
    au.controls = true;
    au.src = url;
    //link the a element to the blob 
    link.href = url;
    link.download = new Date().toISOString() + '.wav';
    link.innerHTML = link.download;
    //add the new audio and a elements to the li element 
    li.appendChild(au);
    li.appendChild(link);
    //add the li element to the ordered list 
    recordingsList.appendChild(li);

    let file = new File([blob], "input_audio.wav");
    console.log(file)
    let fileName = file.name;
    let foldKey = encodeURIComponent('tmp_audio') + '/';
    s3 = new AWS.S3({
        params: {Bucket: 'storerecording'}
    });
    let audioKey = foldKey + fileName;
    console.log(audioKey)
    s3.upload({
        Key: audioKey,
        Body: file,
        ACL: 'public-read'
    }, function(err, data) {
        if (err) {
            console.log(err)
            return alert('Error');
        }
        else{
            alert('Loading');
        }

    });
}




//stop



window.onload = function() {
    init();
    navigator.mediaDevices.getUserMedia({ audio: true },
        () => {
            console.log('Permission Granted');
            isBlocked = false
        },
        () => {
            console.log('Permission Denied');
            isBlocked = true
        }
    )
}

// function start() {
    
//         Mp3Recorder
//             .start()
//             .then(() => {
//                 isRecording = true
//             }).catch((e) => console.error(e));
   
// }

// function stop() {
//     Mp3Recorder
//         .stop()
//         .getMp3()
//         .then(([buffer, blob]) => {
//             const file = new File(buffer, 'speech-search-request.mp3', {
//                 type: blob.type,
//                 lastModified: Date.now()
//             })
//             isRecording = false
//         }).catch((e) => console.log(e));
// }

function searchFromVoice() {
    recognition.start();
  
    recognition.onresult = (event) => {
      console.log(event)
      const speechToText = event.results[0][0].transcript;
      console.log(speechToText);
  
      document.getElementById("searchImageText").value = speechToText;
      search();
    }
  }
  

function search() {
    rowDiv = document.getElementById("imageRow");
    rowDiv.innerHTML = "";
    var searchText = document.getElementById("searchImageText").value;
    var apigClient = apigClientFactory.newClient();
    var body = {
        "q": searchText
    };
    var params = {
        "q":searchText
    };
    var additionalParams = {
        queryParams: {
            q: searchText
        }
    };
    console.log(additionalParams);
    apigClient.searchGet(params, body, additionalParams)
    .then(function (result) {
      console.log('success OK');
      console.log(result.data)
      console.log(result.data['response'])
      showImages(result.data['response']);
    }).catch(function (result) {
    
      console.log("Success not OK");
      
      temp = "<div>Wrong input entered.</div>";
        rowDiv.innerHTML += temp;
    });
}


function showImages(images){
    
    rowDiv = document.getElementById("imageRow");
    rowDiv.innerHTML = "";
    if(images.length == 0 ){
        temp = "<div>No images found for this key.</div>";
        rowDiv.innerHTML += temp;
    }        
    for (var i =0;i<images.length;i++) {
        temp = '<div class="col"><div class="card shadow-sm"> <img src="' + images[i] +'"  width="100%" height="225"></div></div>'
        rowDiv.innerHTML += temp;
    }

}

function upload(input) {

    var reader = new FileReader();
    fileName = input.files[0].name;
    console.log(fileName);
    fileExt = fileName.split(".").pop();
    var onlyfileName = fileName.replace(/\.[^/.]+$/, "");
    var finalfileName = onlyfileName + "_" + Date.now() + "." + fileExt;
    fileName = finalfileName;
    label = document.getElementById("customLabels").value;
    reader.onload = function (e) {
      var src = e.target.result;
      
      var newImage = document.createElement("img");
      newImage.src = src;
      encoded = newImage.outerHTML;
      console.log(encoded);
      last_index_quote = encoded.lastIndexOf('"');
      if (fileExt == 'jpg' || fileExt == 'jpeg' || fileExt == 'png') {
        encodedStr = encoded.substring(33, last_index_quote);
      }
      else {
        encodedStr = encoded.substring(32, last_index_quote);
      }
      var apigClient = apigClientFactory.newClient();
  
      var params = {
          "Content-Type": "image/jpg",
          "item": fileName,
          "folder":"storephotosbucket",
          "x-amz-meta-customLabels": label,
  
      };
  
      var additionalParams = {
        headers: {
          "Content-Type": "image/jpg",
        }
      };
      console.log(encodedStr);
      apigClient.uploadFolderItemPut(params, encodedStr, additionalParams)
        .then(function (result) {
          console.log('success OK');
          document.getElementById("uploadResult").innerHTML = '<p style="color:green;">Uploaded picture successfully!<p> '
        }).catch(function (result) {
          console.log(result);
          document.getElementById("uploadResult").innerHTML = '<p style="color:red;">Error uploading the picture<p>'
        });
    }
    reader.readAsDataURL(input.files[0]);
  }


