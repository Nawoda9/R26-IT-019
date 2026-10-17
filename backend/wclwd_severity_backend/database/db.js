const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database(
    "./database/database.sqlite",
    (err) => {

        if (err) {
            console.log(err.message);
        } else {
            console.log("SQLite Connected");
        }
    }
);

db.run(`
    CREATE TABLE IF NOT EXISTS predictions (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        imagePath TEXT,

        prediction TEXT,

        confidence REAL,

        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

module.exports = db;