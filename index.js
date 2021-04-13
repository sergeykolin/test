const Gdax = require('gdax');
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const WebSocket = require('ws')
const io = new WebSocket.Server({server});
const pairs = ['BTC-USD', 'ETH-USD', 'LTC-USD'];
const clients = [];

const websocket = new Gdax.WebsocketClient(
    pairs,
    'wss://ws-feed.pro.coinbase.com',
    null,
    {"channels": ["full"]}
  );


app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log('user connected');
    let clientPair = [];
    let interval;
    let timeForInterval = 250;
    let clientId = socket.id ? socket.id : new Date().valueOf();
    clients.push(
        {
            id: clientId,
            time: new Date(),
            info: `id = ${clientId}`
        }
    );
    socket.on('close', () => {
        console.log('user disconnected');
        removeUser(clientId)
    });

    socket.on('message', (msg) => {
        if (!msg || typeof msg !== 'string') return;
        let msg_1 = msg.split(' ')[0];
        let msg_2 = msg.split(' ')[1];

        if (msg_1 === 'XRP-USD') socket.send('error: XRP-USD is not a valid product')

        if (pairs.includes(msg_1)) {
            let index = clientPair.findIndex(item => item.pair === msg_1)
            let pair = {pair: msg_1, view: (msg_2 === 'm') ? 'matches view': null};
            if (!msg_2 || msg_2 === 'm') {
                if (index < 0 ) {
                    clientPair.push(pair);
                }
                if (index >= 0) {
                    clientPair[index].view = pair.view;
                }
            }
            if (msg_2 === 'u' && index >= 0) {
                clientPair.splice(index, 1);
            }
        }

        if (msg_1 === 'quit') {
            socket.close();
            removeUser(clientId);
            if (interval) clearInterval(interval);
            return;
        }

        if (msg_1 === 'system' && !msg_2) {
            for (let item of clients ) {
                socket.send(`User: ${item.info}, Subscription start: ${item.time}`);
            }
            return;
        }

        if (msg_1 === 'system' && msg_2 && !isNaN(msg_2)) {
            timeForInterval = parseInt(msg_2);
        }

        if (clientPair.length) {
            if (interval) clearInterval(interval);
            interval = setInterval(() => {
                let date = new Date();
                for (let item of clientPair) {
                    if (tickers[item.pair]) {
                        let message = (!item.view) ?`${item.pair} = ${tickers[item.pair].price} (${date})` :
                        `${item.pair} (price = ${tickers[item.pair].price}; timestamp = ${new Date(tickers[item.pair].time).valueOf()}; size: ${tickers[item.pair].size || tickers[item.pair].remaining_size} )`
                        socket.send( message);
                    }
                    if (!tickers[item.pair]) {
                        socket.send(`We do not have data for this pair ${item.pair}`);
                    }
                }
            }, timeForInterval);
        }
    });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});

let tickers = {};

websocket.on('message', data => {
    if (!data.product_id || !data.price) {
        return;
    }
    tickers[data.product_id] = data;
});

function removeUser(id) {
    let index = clients.findIndex(item => item.id === id);
    if (index >= 0) {
        clients.splice(index, 1);
    }
}
