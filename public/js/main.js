var io = signaling_socket = io();

io.on('connect', function () {
	console.log("Websocket connected!");

    signaling_socket.on('drawToWhiteboard', function (content) {
        whiteboard.handleEventsAndData(content, true);
    });
});

$(document).ready(function() {
	var whiteboardId = "myNewWhiteboard";
	whiteboard.loadWhiteboard("#whiteboardContainer", {
        whiteboardId : whiteboardId,
        username : "Username",
        sendFunction : function(content) {
        	io.emit('drawToWhiteboard', content);
        }
    });

    $.get( "/loadwhiteboard", { wid: whiteboardId } ).done(function( data ) {
        whiteboard.loadData(data)
    });
});