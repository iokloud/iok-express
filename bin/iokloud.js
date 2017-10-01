#!/usr/bin/env node

/**
 * Module dependencies.
 */


require("../lib/ponte").cli(process.argv, function(err) {
  if (err) {
    console.log(err);
    console.log(err.stack);
    process.exit(1);
  }
});
