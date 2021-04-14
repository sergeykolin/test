const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const WebSocket = require('ws')
const ws = new WebSocket.Server({server});
const Transmitter = require('./transmitter');
const logService = require('./services/log-service');


app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

ws.on('connection', (socket) => {
    logService('user connected');
    new Transmitter(socket);
});

server.listen(3000, () => {
    logService('listening on *:3000');
});
