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




