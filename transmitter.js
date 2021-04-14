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
        let param = msg.split(' ')[1];

        if (this.pairs.includes(symbol)) {
            this.parsePairMessage(symbol, param);
        }

        if (symbol === 'quit') {
            this.quit();
            return;
        }

        if (symbol === 'system') {
            this.systemParse(param);
        }

        if (this.clientPair.length) {
            this.sendMessages();
        }
    }

    systemParse(param) {
        if (param && !isNaN(param)) {
            this.updateInterval(param);
        } else {
            this.systemView()
            return;
        }
    }

    updateInterval(time) {
        this.timeForInterval = parseInt(time);
    }

    parsePairMessage(symbol, param) {
        let index = this.clientPair.findIndex(item => item.pair === symbol)
        let pair = {pair: symbol, view: (param === 'm') ? 'matches view': null};
        if (!param || param === 'm') {
            if (index < 0 ) {
                this.clientPair.push(pair);
            } else {
                this.clientPair[index].view = pair.view;
            }
        }
        if (param === 'u' && index >= 0) {
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
                } else {
                    this.send(`We do not have data for this pair ${item.pair}`);
                }
            }
        }, this.timeForInterval);
    }
}
