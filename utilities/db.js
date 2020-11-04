require("dotenv").config();
var Datastore = require("nedb");

let db;

module.exports = {
    init: function() {
        db = {};
        db.events_log = new Datastore({ filename: `./${process.env.EVENTS_DB_PATH}`, autoload: true })
        return db;
    },
    getEventsLogDB(){
        if (!db) {
            return null;
        }
        return module.exports.getDB().events_log;
    },
    getDB: function() {
        if (!db) {
            return null;
        }
        return db;
    }
}