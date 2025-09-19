

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

// Serve static files (index.html, app.js, style.css, etc.)
app.use(express.static(path.join(__dirname)));

// Default route: serve index.html
app.get('*', (req, res) => {
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
