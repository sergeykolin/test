const Gdax = require('gdax');
const logService = require('./log-service');
const pairs = ['BTC-USD', 'ETH-USD', 'LTC-USD', 'XRP-USD'];
const clients = [];
const tickers = [];
const websocket = new Gdax.WebsocketClient(
    pairs,
    'wss://ws-feed.pro.coinbase.com',
    null,
    {"channels": ["full"]}
);
websocket.on('message', data => {
    if (!data.product_id || !data.price) {
        return;
    }
    tickers[data.product_id] = data;
});

websocket.on('error', error => {
    logService(error)
});

module.exports = class CoinbaseTransmitter {
    constructor(){};

    removeClient(clientId) {
        let index = clients.findIndex(item => item.id === clientId);
        if (index >= 0) {
            clients.splice(index, 1);
        }
    }

    addClient(clientId) {
        clients.push(
            {
                id: clientId,
                time: new Date(),
                info: `id = ${clientId}`,
                pairs: []
            }
        );
    }

    updateClientPairs(clientId, pairs) {
        let index = clients.findIndex(item => item.id === clientId);
        if (index >= 0) {
            clients[index].pairs = pairs.map(item => item.pair);
        }
    }

    getClients() {
        return clients;
    }

    getTikers() {
        return tickers;
    }

    getPairs() {
        return pairs;
    }

}