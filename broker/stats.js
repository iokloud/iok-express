const debug = require('debug')('node-mqtt:stats');

class Stats {
    constructor() {
        this.clients = 0;
        this.topics = {};
    }

    getConnectedClients() {
        return this.clients;
    }

    addClient() {
        this.clients++;
		console.log("add Client");
        return this;
    }

    subClient() {
        this.clients--;
        if (this.clients < 0) {
            this.clients = 0;
        }
        return this;
    }

    getSubscribedTopics() {
        return this.topics;
    }

    addTopic(topic) {
        if (this.topics[topic] === undefined) {
            this.topics[topic] = 0;
        }
        this.topics[topic]++;
    }

    subTopic(topic) {
        this.topics[topic]--;
        if (this.topics[topic] <= 0) {
            this.topics[topic] = null;
            delete this.topics[topic];
        }
    }
}

const stats = new Stats();

module.exports = stats;