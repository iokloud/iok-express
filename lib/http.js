'use strict'

/*******************************************************************************
 * Copyright (c) 2013-2017 Matteo Collina
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * and Eclipse Distribution License v1.0 which accompany this distribution.
 *
 * The Eclipse Public License is available at
 *    http://www.eclipse.org/legal/epl-v10.html
 * and the Eclipse Distribution License is available at
 *   http://www.eclipse.org/org/documents/edl-v10.php.
 *
 * Contributors:
 *    Matteo Collina - initial API and implementation and/or initial documentation
 *    Jovan Kostovski - added standard js for source code style checking
 *******************************************************************************/

/**
	* HTTP Module
	* @description This module handles the HTTP requests
	* @module
*/
var http = require('http')
var express = require('express')
var resourcesRegexp = /^\/resources\/(.+)$/
var callback = require('callback-stream')
var bunyan = require('bunyan')
var st = require('st')
var corsify = require('corsify')
var router = express.Router();

var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var mongoose = require('mongoose');
var passport = require('passport');
var config = require('../config/database');

mongoose.connect(config.database);


function HTTP (opts, done) {
	
	var app = express();
	
	var api = require('../routes/api');
	//var apiPub = require('./http');
	
	
	
	// view engine setup
	//app.set('views', path.join(__dirname, 'views'));
	//app.set('view engine', 'jade');
	app.set('views', 'views');
	app.set('view engine', 'jade');
	
	
	
	app.use(function(req, res, next) {
		res.header("Access-Control-Allow-Origin", "*");
		res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
		next();
	});
	
	// uncomment after placing your favicon in /public
	//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
	//app.use(logger('dev'));
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({
		extended: false
	}));
	app.use(cookieParser());
	app.use(express.static(path.join(__dirname, 'public')));
	app.use(morgan('dev'));
	app.use(passport.initialize());
	
	app.get('/', function(req, res) {
		res.send('Page under construction.');
	});
	
	app.get('/resources/*', function(req,res) {  
		console.log('#Get --> /resources')
		var topic = req.url;
		persistence.lookupRetained(topic, function (err, packets) {
			if (err) {
				logger.error(err)
				return
			}
			if (packets.length === 0) {
				res.statusCode = 404
				res.end('Requested Topic Not Found in Presistence!')
				} else {
				res.end(packets[0].payload)
			}
		})
	})
	
	
	app.use('/api', api);
	
	// catch 404 and forward to error handler
	app.use(function(req, res, next) {
		var err = new Error('Not Found');
		err.status = 404;
		next(err);
	});
	
	// error handler
	app.use(function(err, req, res, next) {
		// set locals, only providing error in development
		res.locals.message = err.message;
		res.locals.error = req.app.get('env') === 'development' ? err : {};
		
		// render the error page
		res.status(err.status || 500);
		res.render('error');
	});
	
	
	
	
	if (!(this instanceof HTTP)) {
		return new HTTP(opts, done)
	}
	
	if (typeof opts === 'function') {
		done = opts
		opts = {}
	}
	
	var that = this
	this._persistence = opts.ponte.persistence
	this._ponte = opts.ponte
	
	var persistence = this._persistence
	var ponte = this._ponte
	
	
	if (typeof opts.authenticate === 'function') {
		this.authenticate = opts.authenticate
	}
	
	if (typeof opts.authorizeGet === 'function') {
		this.authorizeGet = opts.authorizeGet
	}
	
	if (typeof opts.authorizePut === 'function') {
		this.authorizePut = opts.authorizePut
	}
	
	var logger = this._logger = opts.ponte.logger.child({
		service: 'HTTP',
		serializers: {
			req: bunyan.stdSerializers.req,
			res: bunyan.stdSerializers.res
		}
	})
	
	console.log('iok-express starting...')
	
	this.server = http.createServer(app);
	this.server.listen(opts.port, opts.host, function (err) {
		done(err, that)
		logger.info({ port: opts.port }, 'server started')
	})
	
	
	if (this._ponte.mqtt) {
		this._ponte.mqtt.attachHttpServer(this.server)
	}
	
	
	module.exports = app	
	
}

HTTP.prototype.close = function (done) {
	this.server.close(done)
}






HTTP.prototype.buildServer = function (opts) {
	var logger = this._logger
	var persistence = this._persistence
	var ponte = this._ponte
	
	var authenticate = this.authenticate
	var authorizeGet = this.authorizeGet
	var authorizePut = this.authorizePut
	
	function handleAuthError (err, res) {
		logger.info(err)
		res.statusCode = 500
		res.end()
	}
	
	function handleNotAuthenticated (res) {
		logger.info('authentication denied')
		res.statusCode = 401
		res.end()
	}
	
	function handleNotAuthorized (res) {
		logger.info('not authorized')
		res.statusCode = 403
		res.end()
	}
	
	var handlePontePublic = st(opts.publicDirs.ponte, {
		index: false,
		passthrough: true,
		dot: opts.publicDirs.mosca.match(/(^|\/)\./)
	})
	
	var handleMoscaPublic = st(opts.publicDirs.mosca, {
		index: false,
		passthrough: false,
		dot: opts.publicDirs.mosca.match(/(^|\/)\./)
	})
	
	function handleGetResource (subject, topic, req, res) {
		if (req.method !== 'GET') {
			return false
		}
		
		authorizeGet(subject, topic, function (err, authorized) {
			if (err) {
				handleAuthError(err, res)
				return
			}
			
			if (!authorized) {
				handleNotAuthorized(res)
				return
			}
			
			persistence.lookupRetained(topic, function (err, packets) {
				if (err) {
					logger.error(err)
					return
				}
				if (packets.length === 0) {
					res.statusCode = 404
					res.end('Not found')
					} else {
					res.end(packets[0].payload)
				}
			})
		})
		
		return true
	}
	
	function handlePutResource (subject, topic, req, res) {
		if (req.method !== 'PUT' && req.method !== 'POST') {
			return false
		}
		
		req.pipe(callback(function (err, payload) {
			if (err) {
				logger.error(err)
				return
			}
			payload = payload[0]
			
			if (typeof payload === 'undefined') {
				payload = ''
			}
			
			authorizePut(subject, topic, payload, function (err, authorized) {
				if (err) {
					handleAuthError(err, res)
					return
				}
				
				if (!authorized) {
					handleNotAuthorized(res)
					return
				}
				
				var packet = { topic: topic, payload: payload, retain: true }
				persistence.storeRetained(packet, function () {
					ponte.broker.publish(topic, payload, {}, function () {
						res.setHeader('Location', '/resources/' + topic)
						res.statusCode = 204
						res.end()
						ponte.emit('updated', topic, new Buffer(payload))
					})
				})
			})
		}))
		
		return true
	}
	
	function handleNotFound (res) {
		res.writeHeader(404)
		res.end('Not Found')
	}
	
	return corsify({
		endOptions: true
		}, function httpServer (req, res) {
		logger.info({ req: req })
		
		res.on('finish', function () {
			logger.info({ res: res })
		})
		
		// Only authenticate requests to the resources
		var match = req.url.match(resourcesRegexp)
		if (match) {
			var topic = match[1]
			
			authenticate(req, function (err, authenticated, subject) {
				if (err) {
					handleAuthError(err, res)
					return
				}
				
				if (!authenticated) {
					handleNotAuthenticated(res)
					return
				}
				
				var handled =
				handleGetResource(subject, topic, req, res) ||
				handlePutResource(subject, topic, req, res)
				
				if (!handled) {
					handleNotFound(res)
				}
			})
			} else {
			// Public libraries do not require authentication
			if (opts.serveLibraries) {
				handlePontePublic(req, res, function () {
					handleMoscaPublic(req, res)
				})
				} else {
				handleNotFound(res)
			}
		}
	})
}

/**
	* The function that will be used to authenticate requests.
	* This default implementation authenticates everybody.
	* The returned subject is just a new Object.
	*
	* @param {Object} req The request object
	* @param {Function} cb The callback function. Has the following structure: cb(err, authenticated, subject)
*/
HTTP.prototype.authenticate = function (req, cb) {
	cb(null, true, {})
}

/**
	* The function that will be used to authorize subjects to GET messages from topics.
	* This default implementation authorizes everybody.
	*
	* @param {Object} subject The subject returned by the authenticate function
	* @param {string} topic The topic
	* @param {Function} cb The callback function. Has the following structure: cb(err, authorized)
*/
HTTP.prototype.authorizeGet = function (subject, topic, cb) {
	cb(null, true)
}

/**
	* The function that will be used to authorize subjects to PUT messages to topics.
	* This default implementation authorizes everybody.
	*
	* @param {Object} subject The subject returned by the authenticate function
	* @param {string} topic The topic
	* @param {string} payload The payload
	* @param {Function} cb The callback function. Has the following structure: cb(err, authorized)
*/
HTTP.prototype.authorizePut = function (subject, topic, payload, cb) {
	cb(null, true)
}

module.exports = HTTP
