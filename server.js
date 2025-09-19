

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import https from 'https';
import fs from 'fs';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname)));

// Serve index.html only for requests that do not look like file requests
app.get('*', (req, res, next) => {
  if (req.path.includes('.') || req.path.startsWith('/bundle.js')) {
    // If the request is for a file (has a dot), skip to static middleware
    return next();
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

// HTTPS options
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'cert.pem')),
};

https.createServer(httpsOptions, app).listen(PORT, () => {
  console.log(`HTTPS server running at https://localhost:${PORT}`);
});
