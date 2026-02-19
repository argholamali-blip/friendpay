const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, 'FriendPay_Frontend');
const types = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.webmanifest': 'application/manifest+json',
    '.svg': 'image/svg+xml'
};

http.createServer((req, res) => {
    let urlPath = req.url.split('?')[0];
    let filePath = path.join(root, urlPath === '/' ? 'index.html' : urlPath);

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(root, 'index.html');
    }

    const ext = path.extname(filePath);
    res.setHeader('Content-Type', types[ext] || 'text/plain');
    res.setHeader('Cache-Control', 'no-cache');

    fs.createReadStream(filePath).on('error', () => {
        res.writeHead(404);
        res.end('Not found');
    }).pipe(res);

}).listen(5500, '0.0.0.0', () => {
    console.log('');
    console.log('✅ Frontend server running!');
    console.log('   On this PC  : http://localhost:5500');
    console.log('   On your phone: http://192.168.100.136:5500');
    console.log('');
});
