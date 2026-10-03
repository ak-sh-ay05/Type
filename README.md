# Type Rally

A multiplayer typing car race. Players join from the main page, wait in a lobby,
and the host starts each race from a separate host page. Up to 30 players per race.

- Players: `https://YOUR-SITE/`
- Host:    `https://YOUR-SITE/host`  (asks for the host key)

## Run it on your own computer

1. Install Node.js 18 or newer from https://nodejs.org
2. In this folder run:
   ```
   npm install
   npm start
   ```
3. Open http://localhost:3000/host and enter the key `rally`.
   Players on the same Wi-Fi can join at `http://YOUR-COMPUTER-IP:3000`.

## Put it online for free (Render)

1. Create a free GitHub account and upload this folder as a new repository
   (on github.com: New repository → "uploading an existing file" → drag the files in).
   Do not upload the `node_modules` folder.
2. Go to https://render.com, sign in with GitHub, click **New → Web Service**
   and pick your repository.
3. Settings:
   - Runtime: Node
   - Build command: `npm install`
   - Start command: `npm start`
   - Instance type: Free
4. Under **Environment**, add a variable `HOST_KEY` with a secret word of your choice.
   This is the password for the host page.
5. Click **Create Web Service**. After a few minutes you get a public link like
   `https://type-rally.onrender.com`. Share that with players; open `/host` yourself.

Note: on Render's free plan the site goes to sleep after about 15 minutes with no
visitors, and the first visit afterwards takes up to a minute to wake it up.
Open the host page a minute before you play.

## Change the passages

Edit the `TEXTS` list in `public/index.html`. If you change how many passages
there are, update `TEXT_COUNT` in `server.js` to match.
