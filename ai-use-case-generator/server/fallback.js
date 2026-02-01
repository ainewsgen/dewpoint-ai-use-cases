const http = require('http');

console.log('!!! STARTING FALLBACK SERVER !!!');
console.log('Main server compilation or execution failed.');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Antigravity Fallback Server: Main Server Crashed');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Fallback server listening on port ${PORT}`);
});
