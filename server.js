const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();


const path = require("path");
const app = express();
app.use(cors());
app.use(bodyParser.json());


app.use(express.static(path.join(__dirname)));

const db = new sqlite3.Database("./financeTracker.db", (err) => {
    if (err) {
        console.error("Error opening database", err);
    } else {
        db.run(
            `CREATE TABLE IF NOT EXISTS finance (
                id INTEGER PRIMARY KEY,
                incomes TEXT,
                expenses TEXT
            )`,
            (err) => {
                if (err) {
                    console.error("Error creating table", err);
                }
            }
        );
    }
});




app.get("/data", (req, res) => {
    db.get("SELECT * FROM finance WHERE id = 1", (err, row) => {
        if (err) {
            res.status(500).json({ error: "Database error" });
        } else if (row) {
            res.json({
                incomes: JSON.parse(row.incomes),
                expenses: JSON.parse(row.expenses),
            });
        } else {
            res.json({ incomes: [], expenses: [] });
        }
    });
});


app.post("/data", (req, res) => {
    const incomes = JSON.stringify(req.body.incomes || []);
    const expenses = JSON.stringify(req.body.expenses || []);
    db.run(
        `INSERT INTO finance (id, incomes, expenses) VALUES (1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET incomes=excluded.incomes, expenses=excluded.expenses`,
        [incomes, expenses],
        function (err) {
            if (err) {
                res.status(500).json({ error: "Database error" });
            } else {
                res.status(200).json({ message: "Data saved successfully!" });
            }
        }
    );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
