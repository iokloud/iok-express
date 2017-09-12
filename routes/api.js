var mongoose = require('mongoose');
var passport = require('passport');
var config = require('../config/database');
require('../config/passport')(passport);
var express = require('express');
var jwt = require('jsonwebtoken');
var uniqid = require('uniqid');
var router = express.Router();
var User = require("../models/user");
var Thing = require("../models/thing");
var broker = require("../broker/mosca.js");

router.post('/signup', function(req, res) {
  if (!req.body.username || !req.body.password) {
    res.json({success: false, msg: 'Please pass username and password.'});
  } else {
    var newUser = new User({
      username: req.body.username,
      password: req.body.password
    });
    // save the user
    newUser.save(function(err) {
      if (err) {
        return res.json({success: false, msg: 'Username already exists.'});
      }
      res.json({success: true, msg: 'Successful created new user.'});
    });
  }
});

router.post('/signin', function(req, res) {
  User.findOne({
    username: req.body.username
  }, function(err, user) {
    if (err) throw err;

    if (!user) {
      res.status(401).send({success: false, msg: 'Authentication failed. User not found.'});
    } else {
      // check if password matches
      user.comparePassword(req.body.password, function (err, isMatch) {
        if (isMatch && !err) {
          // if user is found and password is right create a token
          var token = jwt.sign(user, config.secret);
          // return the information including token as JSON
          res.json({success: true, token: 'JWT ' + token});
        } else {
          res.status(401).send({success: false, msg: 'Authentication failed. Wrong password.'});
        }
      });
    }
  });
});

router.post('/thing', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    console.log(req.body);
    var newThing = new Thing({
      name: req.body.name,
	  //location: req.body.location,
	  //description: req.body.description,
	  //type: req.body.type,
	  //createat: Date.now(),
	  clientid: uniqid(),	//req.body.clientid,
	  username: uniqid(),	//req.body.username,
	  password: uniqid()	//,  //req.body.password
	  //config: req.body.config
    });

    newThing.save(function(err) {
      if (err) {
        console.log('Save thing failed.');
		console.log(err);
		return res.json({success: false, msg: 'Save thing failed.'});
      }
      console.log('Successful created new thing.');
	  console.log(newThing);
	  res.json({success: true, msg: 'Successful created new thing.'});
    });
  } else {
    return res.status(403).send({success: false, msg: 'Unauthorized.'});
  }
});


router.get('/thing', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    Thing.find(function (err, things) {
      if (err) return next(err);
      res.json(things);
    });
  } else {
    return res.status(403).send({success: false, msg: 'Unauthorized.'});
  }
});



router.get('/thing/:clientid', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    console.log(req.body);
	
	Thing.findOne({clientid: req.params.clientid}, function(err, things) {
    if (err) {
        console.log('Quering thing failed.');
		console.log(err);
		return res.json({success: false, msg: 'Quering thing failed.'});
      }
	if (!things) {
		console.log("ClientId Not found");
		return res.status(403).send({success: false, msg: 'ClientID not found.'});
	}  
      console.log('Successful query.');
	  res.json(things);
    });
  } else {
    return res.status(403).send({success: false, msg: 'Unauthorized.'});
  }
});

router.put('/thing/:clientid', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    console.log(req.body);
	
	Thing.findOneAndUpdate({clientid: req.params.clientid}, req.body, {new: true}, function(err, doc) {
    if (err) {
        console.log('Save thing failed.');
		console.log(err);
		return res.json({success: false, msg: 'Save thing failed.'});
      }
	if (!doc) {
		console.log("ClientId Not found");
		return res.status(403).send({success: false, msg: 'ClientID not found.'});
	}  
      console.log('Successful created new thing.');
	  res.json({success: true, msg: 'Successful updated thing.'});
    });
  } else {
    return res.status(403).send({success: false, msg: 'Unauthorized.'});
  }
});


router.delete('/thing/:clientid', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
	Thing.findOneAndRemove({clientid: req.params.clientid}, function (err, doc) {
    if (err) {
        console.log(err);
		res.send(err);
    }
    if (!doc) {
		console.log("ClientId Not found");
		return res.status(403).send({success: false, msg: 'ClientID not found.'});
	}
    
    res.json({ message: 'Thing successfully deleted' });
	});
  } else {
    return res.status(403).send({success: false, msg: 'Unauthorized.'});
  }
});



getToken = function (headers) {
  if (headers && headers.authorization) {
    var parted = headers.authorization.split(' ');
    if (parted.length === 2) {
      return parted[1];
    } else {
      return null;
    }
  } else {
    return null;
  }
};

module.exports = router;
