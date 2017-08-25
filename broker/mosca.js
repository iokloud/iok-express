const debug = require('debug')('node-mqtt:mosca');
const mosca = require('mosca');
const events = require('./moscaEvents.js');
const mqttPort = process.env.MQTT_PORT || 1883;

module.exports = (httpServer) => {
    /*
     const pubsubsettings = {
     type: 'redis',
     redis: require('redis'),
     db: 12,
     port: 6379,
     return_buffers: true, // to handle binary payloads
     host: "localhost"
     };
     */

    const moscaSettings = {
        port: parseInt(mqttPort),
        backend: {},
        persistence: {
            factory: mosca.persistence.Memory
        }
    };

    const server = new mosca.Server(moscaSettings);
    server.attachHttpServer(httpServer);
    server.on('ready', () => {
        debug('mosca server is up and running on port ' + mqttPort);
    });
    server.on('error', (error) => {
        debug('error: ', error);
    });
    server.on('clientConnected', events.onClientConnected);
    server.on('clientDisconnecting', events.onClientDisconnecting);
    server.on('clientDisconnected', events.onClientDisconnected);
    server.on('subscribed', events.onSubscribed);
    server.on('unsubscribed', events.onUnsubscribed);
    server.on('delivered', events.onDelivered);
    server.on('published', (packet, client) => {
        if (!packet.topic.startsWith('$SYS/')) {
            events.onPublished(packet, client);
        }
    });

    return server;
};


