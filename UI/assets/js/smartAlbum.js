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
    for (var i =0;i<images.length;i++){
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

  function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
  }
