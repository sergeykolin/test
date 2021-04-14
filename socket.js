'use strict';
const CoinbaseService = require('./services/service');
const logService = require('./services/log-service');

module.exports = class SocetCoinBase {
    constructor(socket) {
        this.socket = socket;
        this.clientPair = [];
        this.interval = null;
        this.timeForInterval = 250;
        this.clientId = socket.id ? socket.id : new Date().valueOf();
        this.coinbaseService = new CoinbaseService()
        this.coinbaseService.addClient(this.clientId);
        this.pairs = this.coinbaseService.getPairs();

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
        let msg_1 = msg.split(' ')[0];
        let msg_2 = msg.split(' ')[1];

        if (msg_1 === 'XRP-USD') this.send('error: XRP-USD is not a valid product')

        if (this.pairs.includes(msg_1)) {
            this.parsePairMessage(msg_1, msg_2);
        }

        if (msg_1 === 'quit') {
            this.quit();
            return;
        }

        if (msg_1 === 'system' && !msg_2) {
            this.systemView()
            return;
        }

        if (msg_1 === 'system' && msg_2 && !isNaN(msg_2)) {
            this.timeForInterval = parseInt(msg_2);
        }

        if (this.clientPair.length) {
            this.sendMessages();
        }
    }

    parsePairMessage(msg_1, msg_2) {
        let index = this.clientPair.findIndex(item => item.pair === msg_1)
        let pair = {pair: msg_1, view: (msg_2 === 'm') ? 'matches view': null};
        if (!msg_2 || msg_2 === 'm') {
            if (index < 0 ) {
                this.clientPair.push(pair);
            }
            if (index >= 0) {
                this.clientPair[index].view = pair.view;
            }
        }
        if (msg_2 === 'u' && index >= 0) {
            this.clientPair.splice(index, 1);
        }
        this.coinbaseService.updateClientPairs(this.clientId, this.clientPair)
    }

    quit() {
        this.socket.close();
        this.removeClient();
        if (this.interval) clearInterval(this.interval);
    }

    removeClient() {
        this.coinbaseService.removeClient(this.clientId);
    }

    systemView() {
        const clients = this.coinbaseService.getClients();
        for (let item of clients ) {
            let pairs = item.pairs.length ? item.pairs : 'none'
            this.send(`User: ${item.info}, Connection start: ${item.time}, subscriptions: ${pairs}`);
        }
    }

    send(message) {
        this.socket.send( message);
    }

    sendMessages() {
        const tickers = this.coinbaseService.getTikers();
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
