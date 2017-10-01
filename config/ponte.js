
module.exports = {
  id: 'ioboard', // used to publish in the $SYS/<id> topicspace
  stats: false, // publish stats in the $SYS/<id> topicspace
  http: {
    port: 3000 // tcp
  },
  mqtt: {
    port: 1883 // tcp
  },
  coap: {
    port: 3003 // udp
  },
  persistence: {
    // same as http://mcollina.github.io/mosca/docs/lib/persistence/mongo.js.html
    type: "mongo",
    url: "mongodb://localhost:27017/ponte"
  },
  broker: {
    // same as https://github.com/mcollina/ascoltatori#mongodb
    type: "mongo",
    url: "mongodb://localhost:27017/ponte"
  },
  logger: {
    level: 30, // or 20 or 40
    name: "MongoPonte"
  }
};