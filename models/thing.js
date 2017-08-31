var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ThingSchema = new Schema({
  clientid: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('Thing', ThingSchema);
