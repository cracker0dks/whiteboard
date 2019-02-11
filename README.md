# whiteboard
This is a lightweight NodeJS collaborative Whiteboard/Sketchboard witch can easily be customized...

![start](https://raw.githubusercontent.com/cracker0dks/whiteboard/master/doc/start.png)

## Some Features
* Shows remote user cursors while drawing
* Undo function for each user (strg+z)
* Drag+Drop / Copy+Paste Images to Whiteboard from PC and Browsers
* Resize, Move & Draw Images to Canvas or Background
* Write text
* Save Whiteboard to Image and JSON
* Draw angle lines by pressing "shift" while drawing (with line tool)
* Draw square by pressing "shift" while drawing (with rectangle tool)
* Working on PC, Tablet & Mobile

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

## API
Call your site with GET parameters to change the WhiteboardID or the Username

`http://YOURIP:8080?whiteboardid=MYID&username=MYNAME`

* whiteboardid => All people with the same ID are drawing on the same board
* username => The name witch is showing to others while drawing

## Security - AccessToken (Optional)
To prevent clients who might know or guess the base URL from abusing the server to upload files and stuff..., you can set an accesstoken at server start.

<b>Without docker:</b> `node server.js --accesstoken="mySecToken"`

<b>With docker:</b> `docker run -d -e accesstoken="mySecToken" -p 8080:8080 rofl256/whiteboard`

Then set the same token on the client side as well.

<b>Client (With and without docker):</b> `http://YOURIP:8080?accesstoken=mySecToken&whiteboardid=MYID&username=MYNAME`

Done!

## Things you may want to know
* Whiteboards are gone if you restart the Server, so keep that in mind (or save your whiteboard)
* You shoud be able to customize the layout without ever toutching the whiteboard.js (take a look at index.html & main.js)

## ToDo
* Make undo function more reliable on texts
* Add more callbacks for errors and things ...

## Nginx Reverse Proxy configuration
Add this to your server part:
```
    location /whiteboard/ {
        proxy_set_header HOST $host;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_pass http://YOURIP:8080/;
    }
```
To run it at /whiteboard. Don't forget to change -> YOURIP!

## Nextcloud integration
1. Install this app on your server
2. Enable and go to "external sites" on your Nextcloud
2. Add Link to your server: `https://YOURIP/whiteboard/?whiteboardid=WHITEBOARDNAME&username={uid}`
You can give each group its own whiteboard by changeing the WHITEBOARDNAME in the URL if you want.

Note: You might have to serve the app with https (If your nextcloud server runs https). To do so, its recommend to run this app behind a reverse proxy. (as shown above)

#### (Optional) Set whiteboard icon in nextcloud
![start](https://raw.githubusercontent.com/cracker0dks/whiteboard/master/doc/iconPrev.jpg)

Upload both icons present at /doc/nextcloud_icons/ to your nextcloud at the "external sites" admin section. Then set it as symbol on your link.




___ MIT License ___
