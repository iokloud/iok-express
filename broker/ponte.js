const debug = require('debug')('iok-express:ponte');
const ponte = require('ponte');
var config = require('../config/ponte.js');
var mongoose = require('mongoose');
var Thing = require("../models/thing");


module.exports = (httpServer) => {
    
	
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
			if (username == things.config.username && password == things.config.password)	{
				console.log('Successful MQTT credintial. Client ID:' + client.id);
				callback(null, true);
				return;
			}
			else {
				console.log('Unsuccessful MQTT credintial. Client ID:' + client.id + '  ,Username:' + username + '  ,Password:' + password);
				callback(null, false);	
			}
		});
	}
	
	
	// In this case the client authorized as alice can publish to /users/alice taking
	// the username from the topic and verifing it is the same of the authorized user
	var authorizePublish = function(client, topic, payload, callback) {
		//console.dir(client, { depth: null });
		
		
		
		/**
			* Find properties matching the value down the object tree-structure.
			* Ignores prototype structure and escapes endless cyclic nesting of
			* objects in one another.
			* @param {Object} object Object possibly containing the value.
			* @param {String} value Value to search for.
			* @returns {Array<String>} Property paths where the value is found. 
		*/
		function getPropertyByValue(object, value) {
			var valuePaths;
			var visitedObjects = [];
			
			function collectValuePaths(object, value, path, matchings) {
				
				for (var property in object) {
					
					if (
					visitedObjects.indexOf(object) < 0 &&
					typeof object[property] === 'object') {
						
						// Down one level:
						
						visitedObjects.push(
						object);
						
						path =
						path +
						property + ".";
						
						collectValuePaths(
						object[property],
						value,
						path,
						matchings);
					}
					
					if (object[property] === value) {
						
						// Matching found:
						
						matchings.push(
						path +
						property);
					}
					
					path = "";
				}
				
				return matchings;
			}
			
			valuePaths =
			collectValuePaths(
			object,
			value,
			"",
			[]);
			
			return valuePaths;
		};		
		
		
		
		console.log(getPropertyByValue(client,'8d0rgh6p8j7utxebv'));
		
		callback(null, client.id == topic.split('/')[1]);
	}
	
	// In this case the client authorized as alice can subscribe to /users/alice taking
	// the username from the topic and verifing it is the same of the authorized user
	var authorizeSubscribe = function(client, topic, callback) {
		console.log(topic.split('/')[1]);
		callback(null, client.id == topic.split('/')[1]);
	}
	
	
	config.mqtt.authenticate = authenticate;
	config.mqtt.authorizePublish = authorizePublish;
	config.mqtt.authorizeSubscribe = authorizeSubscribe;
	
	var server = ponte(config);
	
	
    //server.attachHttpServer(httpServer);
	
	server.on("updated", function(resource, buffer) {
		console.log("Resource Updated", resource, buffer);
	});	
    server.on('ready', () => {
		console.log('mosca server is up and running on port ' + config.mqttPort);
	});
    server.on('error', (error) => {
        console.log('error: ', error);
	});
	
	
	
    return server;
};
