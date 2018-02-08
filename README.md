# whiteboard
This is a lightweight NodeJS collaborative Whiteboard witch can easily be customized...

![start](./doc/start.png)

## Some Features
* Showing remote user cursors while drawing
* Undo function for each user
* Drag & Drop Images to Whiteboard from PC and Browsers
* Copy & Paste Images from Clipboard
* Resize, Move & Draw Images to Canvas or Background
* Save Whiteboard to Image and JSON
* Draw angle lines by pressing "shift" while drawing (with line tool)
* Draw square by pressing "shift" while drawing (with rectangle tool)

## Install the App
You can run this app with and without docker
### Without Docker
1. install the latest NodeJs
2. Clone the app
3. Run `npm i` inside the folder
4. Run `node server.js`
5. Surf to http://YOURIP:8080

### With Docker
1. `docker run -d -p 8080:8080 rofl256/whiteboard`
2. Surf to http://YOURIP:8080

## Things you may want to know
* Whiteboards are gone if you restart the Server, so keep that in mind (or save your whiteboard)
* This is just a sample layout to show the functions available
* You shoud be able to customize without ever toutching the whiteboard.js (take a look at index.html & main.js)
