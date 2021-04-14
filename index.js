const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const WebSocket = require('ws')
const io = new WebSocket.Server({server});
const SocketCoinBase = require('./socket');
const logService = require('./services/log-service');


app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    logService('user connected');
    const clientSocket = new SocketCoinBase(socket);
});

server.listen(3000, () => {
    logService('listening on *:3000');
});
