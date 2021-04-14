'use strict';
const CoinbaseTransmitter = require('./services/coinbaseTransmitter');
const logService = require('./services/log-service');

module.exports = class Transmitter {
    constructor(socket) {
        this.socket = socket;
        this.clientPair = [];
        this.interval = null;
        this.timeForInterval = 250;
        this.clientId = socket.id ? socket.id : new Date().valueOf();
        this.coinbaseTransmitter = new CoinbaseTransmitter()
        this.coinbaseTransmitter.addClient(this.clientId);
        this.pairs = this.coinbaseTransmitter.getPairs();

        this.socket.on('close', () => {
            logService('user disconnected');
            this.removeClient()
        });

        this.socket.on('message', (msg) => {
            this.readMsg(msg);
        });
    }

    readMsg(msg) {
        if (!msg || typeof msg !== 'string') return;
        let symbol = msg.split(' ')[0];
        let action = msg.split(' ')[1];

        if (symbol === 'XRP-USD') this.send('error: XRP-USD is not a valid product')

        if (this.pairs.includes(symbol)) {
            this.parsePairMessage(symbol, action);
        }

        if (symbol === 'quit') {
            this.quit();
            return;
        }

        if (symbol === 'system' && !action) {
            this.systemView()
            return;
        }

        if (symbol === 'system' && action && !isNaN(action)) {
            this.timeForInterval = parseInt(action);
        }

        if (this.clientPair.length) {
            this.sendMessages();
        }
    }

    parsePairMessage(symbol, action) {
        let index = this.clientPair.findIndex(item => item.pair === symbol)
        let pair = {pair: symbol, view: (action === 'm') ? 'matches view': null};
        if (!action || action === 'm') {
            if (index < 0 ) {
                this.clientPair.push(pair);
            }
            if (index >= 0) {
                this.clientPair[index].view = pair.view;
            }
        }
        if (action === 'u' && index >= 0) {
            this.clientPair.splice(index, 1);
        }
        this.coinbaseTransmitter.updateClientPairs(this.clientId, this.clientPair)
    }

    quit() {
        this.socket.close();
        this.removeClient();
        if (this.interval) clearInterval(this.interval);
    }

    removeClient() {
        this.coinbaseTransmitter.removeClient(this.clientId);
    }

    systemView() {
        const clients = this.coinbaseTransmitter.getClients();
        for (let item of clients ) {
            let pairs = item.pairs.length ? item.pairs : 'none'
            this.send(`User: ${item.info}, Connection start: ${item.time}, subscriptions: ${pairs}`);
        }
    }

    send(message) {
        this.socket.send( message);
    }

    sendMessages() {
        const tickers = this.coinbaseTransmitter.getTikers();
        if (this.interval) {
            clearInterval(this.interval);
        }
        this.interval = setInterval(() => {
            let date = new Date();
            for (let item of this.clientPair) {
                if (tickers[item.pair]) {
                    let message = (!item.view) ?`${item.pair} = ${tickers[item.pair].price} (${date})` :
                    `${item.pair} (price = ${tickers[item.pair].price}; timestamp = ${new Date(tickers[item.pair].time).valueOf()}; size: ${tickers[item.pair].size || tickers[item.pair].remaining_size} )`;
                    this.send(message);
                }
                if (!tickers[item.pair]) {
                    this.send(`We do not have data for this pair ${item.pair}`);
                }
            }
        }, this.timeForInterval);
    }
}
