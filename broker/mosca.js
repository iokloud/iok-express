const debug = require('debug')('iok-express:mosca');
const mosca = require('mosca');
const events = require('./moscaEvents.js');
const mqttPort = process.env.MQTT_PORT || 1883;
var mongoose = require('mongoose');
var Thing = require("../models/thing");


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
		console.log('mosca server is up and running on port ' + mqttPort);
    });
    server.on('error', (error) => {
        console.log('error: ', error);
    });

	//var auth = new mosca.Authorizer();
	
	// Accepts the connection if the username and password are valid
	var authenticate = function (client, username, password, callback) {
		Thing.findOne({clientid: client.id}, function(err, things) {
			if (err) {
				console.log('Quering thing failed.');
				console.log(err);
				callback(null, false);
				return;
			}
			if (!things) {
				console.log("ClientID Not found, Client ID:" + client.id);
				callback(null, false);
				return;
			}  
			if (username == things.username && password == things.password)	{
				console.log('Successful MQTT credintial. Client ID:' + client.id);
				callback(null, true);
				return;
			}
			else {
				console.log('Unsuccessful MQTT credintial. Client ID:' + client.id);
				callback(null, false);	
			}
		});
	}
	
	
	// In this case the client authorized as alice can publish to /users/alice taking
	// the username from the topic and verifing it is the same of the authorized user
	var authorizePublish = function(client, topic, payload, callback) {
		callback(null, client.user == topic.split('/')[1]);
	}

	// In this case the client authorized as alice can subscribe to /users/alice taking
	// the username from the topic and verifing it is the same of the authorized user
	var authorizeSubscribe = function(client, topic, callback) {
		callback(null, client.user == topic.split('/')[1]);
	}


	server.authenticate = authenticate;
	server.authorizePublish = authorizePublish;
	server.authorizeSubscribe = authorizeSubscribe;
	
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
