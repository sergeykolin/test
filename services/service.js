const Gdax = require('gdax');
const pairs = ['BTC-USD', 'ETH-USD', 'LTC-USD'];
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

module.exports = class ServiceCoinBase {
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