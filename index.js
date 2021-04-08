const Gdax = require('gdax');
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server);
const pair = ['BTC-USD', 'ETH-USD', 'LTC-USD'];
const clients = [];

const websocket = new Gdax.WebsocketClient(
    pair,
    'wss://ws-feed.pro.coinbase.com'
  );

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    let clientPair = [];
    let interval;
    let intervalMsgType;
    let clientId = socket.id;
    clients.push({id: clientId, time: socket.handshake.time,info: socket.handshake.headers['user-agent']});
    console.log('a user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
        removeUser(clientId)
    });

    socket.on('message', (msg) => {
        if (interval) clearInterval(interval)
        if (pair.includes(msg) && !clientPair.includes(msg)) clientPair.push(msg);
        if (msg === 'quit') {
            socket.off('message', (cb) => {console.log('client quit')});
            removeUser(clientId)
            return;
        }
        if (msg === 'u') clientPair.length = 0;
        if (msg === 'show') {
            for (let item of clients ) {
                socket.emit('event', `User: ${item.info}, Subscription start: ${item.time}`);
            }
            return;
        }
        if (!clientPair.length || !msg) {
            return;
        }

        let timeForInterval = 250;

        if (!isNaN(msg)) {
            timeForInterval = parseInt(msg);
        }

        if (msg === 's' || msg === 'm') {
            intervalMsgType = msg
        }

        if (intervalMsgType) {
            interval = setInterval(() => {
                let date = new Date();
                for (let item of clientPair) {
                    if (tickers[item]) {
                        let message = (intervalMsgType === 's') ?`${item} = ${tickers[item].price} (${date})` :
                        `${item} (price = ${tickers[item].price}; timestamp = ${new Date(tickers[item].time).valueOf()}; )`
                        socket.emit('event', message);
                    } else {
                        socket.emit('event', `We do not have data for this pair ${item}`);
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
    if (!data.product_id) {
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
