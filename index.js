const Gdax = require('gdax');
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server);
const pair = ['BTC-USD', 'ETH-USD', 'LTC-USD']

const websocket = new Gdax.WebsocketClient(
    pair,
    'wss://ws-feed.pro.coinbase.com'
  );

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    let clientPair;
    let interval;
    console.log('a user connected', socket.id);
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    socket.on('message', (msg) => {
        if (interval) clearInterval(interval)
        if (pair.includes(msg)) clientPair = msg;
        if (msg === 'quit') {
            socket.off('message', (cb) => {console.log('client quit')});
            return;
        }
        if (msg === 'u') clientPair = null;
        if (!clientPair || !msg) {
            return;
        }

        let timeForInterval = 250;

        if (!isNaN(msg)) {
            timeForInterval = parseInt(msg);
            msg = 's';
        }

        if (msg === 's') {
            interval = setInterval(() => {
                let message = `${clientPair} = ${tickers[clientPair]} (${new Date()})`
                socket.emit('event', message);
            }, timeForInterval);
        }
    });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});

let tickers = {};

websocket.on('message', data => {
    if (!data.product_id) {
        return;
    }
    tickers[data.product_id] = data.price;
});
