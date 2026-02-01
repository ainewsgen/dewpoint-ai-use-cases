import http from 'http';

console.log('!!! STARTING FALLBACK SERVER !!!');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Antigravity Fallback Server: SUCCESS');
});

const PORT = process.env.PORT || 3000;
server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Fallback server listening on port ${PORT}`);
});
