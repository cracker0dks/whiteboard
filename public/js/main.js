var whiteboardId = "myNewWhiteboard";
var myUsername = "Default";

var io = signaling_socket = io();

io.on('connect', function () {
	console.log("Websocket connected!");

    signaling_socket.on('drawToWhiteboard', function (content) {
        whiteboard.handleEventsAndData(content, true);
    });
});

$(document).ready(function() {
	whiteboard.loadWhiteboard("#whiteboardContainer", { //Load the whiteboard
        whiteboardId : whiteboardId,
        username : myUsername,
        sendFunction : function(content) {
        	io.emit('drawToWhiteboard', content);
        }
    });

    $.get( "/loadwhiteboard", { wid: whiteboardId } ).done(function( data ) {
        whiteboard.loadData(data)
    });

    /*----------------/
	Whiteboard actions
    /----------------*/

    $("#whiteboardTrashBtn").click(function() {
    	whiteboard.clearWhiteboard();
    });

    $("#whiteboardUndoBtn").click(function() {
    	whiteboard.undoWhiteboardClick();
    });
    
    $(".whiteboardTool").click(function() {
        $(".whiteboardTool").removeClass("active");
        $(this).addClass("active");
        whiteboard.setTool($(this).attr("tool"));
    });

    $("#addImgToCanvasBtn").click(function() {
    	alert("Just drag and drop images in!");
    });

    $("#saveAsImageBtn").click(function() {
    	var imgData = whiteboard.getImageDataBase64();
	    var a = document.createElement('a');
		a.href = imgData;
		a.download = 'whiteboard.png';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
    });

    $("#saveAsJSONBtn").click(function() {
    	var imgData = whiteboard.getImageDataJson();
    	var a = window.document.createElement('a');
		a.href = window.URL.createObjectURL(new Blob([imgData], {type: 'text/json'}));
		a.download = 'whiteboard.json';
		// Append anchor to body.
		document.body.appendChild(a);
		a.click();
		// Remove anchor from body
		document.body.removeChild(a);
    });    

    var dragCounter = 0;
    $('#whiteboardContainer').on("dragenter", function(e) {
     	e.preventDefault();
    	e.stopPropagation();
        dragCounter++;
        whiteboard.dropIndicator.show();
	});
	     
	$('#whiteboardContainer').on("dragleave", function(e) {
     	e.preventDefault();
    	e.stopPropagation();
         dragCounter--;
         if (dragCounter === 0) { 
             whiteboard.dropIndicator.hide();
         }
    });

	$("#whiteboardThicknessSlider").on("change", function() {
        whiteboard.thickness = $(this).val();
    });
    
    $('#whiteboardContainer').on('drop', function(e) { //Handle drag & drop
    	if(e.originalEvent.dataTransfer){
            if(e.originalEvent.dataTransfer.files.length) { //File from harddisc
                e.preventDefault();
                e.stopPropagation();

                var filename = e.originalEvent.dataTransfer.files[0]["name"];
                if(isImageFileName(filename)) {	
	                var form = $('<form action="#" enctype="multipart/form-data" method="post"></form>');
	                var formData = new FormData(form[0]);
	                formData.append("file", e.originalEvent.dataTransfer.files[0]);
			        formData.append("userId", ownSocketId);
			        formData.append("uploadType", "singleFileUpload");
			        formData.append("room", roomImIn["roomName"]);
			        sendFormData(formData, function(msg) {
			        	//success callback
			        	whiteboard.addImgToCanvasByUrl(document.URL.substr(0,document.URL.lastIndexOf('/'))+"/singlefiles/"+filename);
			        	writeToChat("Success", "Upload success!");
			        },  function(err) {
			        	writeToChat("Error", err);
			        }, function(progress) {
			        	writeToChat("Uploading", progress+'%');
			        	//Upload progress
			        }, function(progress) {
			        	//Download progress
			        });
			    } else {
			    	writeToChat("Error", "File must be an image!");
			    }
            } else { //File from other browser
            	var fileUrl = e.originalEvent.dataTransfer.getData('URL');
            	var imageUrl = e.originalEvent.dataTransfer.getData('text/html');
			    var rex = /src="?([^"\s]+)"?\s*/;
			    var url = rex.exec(imageUrl);
			    if(url && url.length > 1) {
			    	url = url[1];
			    } else {
			    	url = "";
			    }

			    isValidImageUrl(fileUrl, function(isImage) {
			    	if(isImage && isImageFileName(url)) {
			    		whiteboard.addImgToCanvasByUrl(fileUrl);
			    	} else {
			    		isValidImageUrl(url, function(isImage) {
			    			if(isImage) {
			    				if(isImageFileName(url)) {
			    					whiteboard.addImgToCanvasByUrl(url);
			    				} else {
			    					var date =  (+new Date());
				            		$.ajax({
							            type: 'POST',
							            url: document.URL.substr(0,document.URL.lastIndexOf('/'))+'/upload',
							            data: { 
							                'imagedata': url,
							                'room' : roomImIn["roomName"],
							                'name' : "whiteboard",
							                'date' : date,
							                'userId' : ownSocketId,
							                'uploadType' : "singleFileUpload"
							                },
							            success: function(msg){
							            	var filename = username+"_whiteboard_"+date+".png";
							            	whiteboard.addImgToCanvasByUrl(document.URL.substr(0,document.URL.lastIndexOf('/'))+"/singlefiles/"+filename);
							                writeToChat("Server", "Image uploaded");
							                
							            },
							            error : function(err) {
							                writeToChat("Error", "Failed to upload frame: "+JSON.stringify(err));
							            }
							        });
			    				}
			    			} else {
			    				writeToChat("Error", "Can only upload imagedata!");
			    			}
			    		});
			    	}
			    });
            } 
        }
        dragCounter = 0;
        whiteboard.dropIndicator.hide();
    });
    
    $('#whiteboardColorpicker').colorPicker({
    	renderCallback : function(elm) {
    		whiteboard.drawcolor = elm.val();
    	}
    });
});

//Prevent site from changing tab on drag&drop
window.addEventListener("dragover",function(e){
  e = e || event;
  e.preventDefault();
},false);
window.addEventListener("drop",function(e){
  e = e || event;
  e.preventDefault();
},false);

function isImageFileName(filename) {
    var ending = filename.split(".")[filename.split(".").length-1];
    if(ending.toLowerCase()=="png" || ending.toLowerCase()=="jpg" || ending.toLowerCase()=="jpeg" || ending.toLowerCase()=="gif" || ending.toLowerCase()=="tiff") {
        return true;
    }
    return false;
}

function isValidImageUrl(url, callback) { //Check if given url it is a vaild img url
    var img = new Image();
    var timer = null;
    img.onerror = img.onabort = function () {
        clearTimeout(timer);
        callback(false);
    };
    img.onload = function () {
        clearTimeout(timer);
        callback(true);
    };
    timer = setTimeout(function () {
        callback(false);
    }, 2000);
    img.src = url;
}

window.addEventListener("paste", function(e) { //Even do copy & paste from clipboard
	if (e.clipboardData) {
		var items = e.clipboardData.items;
  		if (items) {
	         // Loop through all items, looking for any kind of image
	         for (var i = 0; i < items.length; i++) {
	            if (items[i].type.indexOf("image") !== -1) {
	               // We need to represent the image as a file,
	               var blob = items[i].getAsFile();
	              
	               	var reader = new window.FileReader();
					reader.readAsDataURL(blob);
					reader.onloadend = function() {
						console.log("Uploading image!");
					    base64data = reader.result;                
					    var date =  (+new Date());
	            		$.ajax({
				            type: 'POST',
				            url: document.URL.substr(0,document.URL.lastIndexOf('/'))+'/upload',
				            data: { 
				                'imagedata': base64data,
				                'room' : roomImIn["roomName"],
				                'name' : "whiteboard",
				                'date' : date,
				                'userId' : ownSocketId,
				                'uploadType' : "singleFileUpload"
				                },
				            success: function(msg){
				            	var filename = username+"_whiteboard_"+date+".png";
				            	whiteboard.addImgToCanvasByUrl(document.URL.substr(0,document.URL.lastIndexOf('/'))+"/singlefiles/"+filename); //Add image to canvas
				                console.log("Image uploaded!");
				            },
				            error : function(err) {
				                console.error("Failed to upload frame: "+JSON.stringify(err));
				            }
				        });
					}
	            }
	         }
        }
	}
});