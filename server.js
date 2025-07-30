const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();


const path = require("path");
const app = express();
app.use(cors());
app.use(bodyParser.json());



// Apply basic authentication to all routes (including static files)
app.use(basicAuth);
app.use(express.static(path.join(__dirname)));

// --- Basic Authentication Middleware ---
const BASIC_AUTH_USER = process.env.FINANCE_USER || "pv";
const BASIC_AUTH_PASS = process.env.FINANCE_PASS || "cordeiro";

function basicAuth(req, res, next) {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Basic ')) {
        res.set('WWW-Authenticate', 'Basic realm="FinanceTracker"');
        return res.status(401).send('Authentication required.');
    }
    const base64 = auth.split(' ')[1];
    const [user, pass] = Buffer.from(base64, 'base64').toString().split(':');
    if (user === BASIC_AUTH_USER && pass === BASIC_AUTH_PASS) {
        return next();
    }
    res.set('WWW-Authenticate', 'Basic realm="FinanceTracker"');
    return res.status(401).send('Invalid credentials.');
}

// --- End Basic Authentication Middleware ---

const db = new sqlite3.Database("./financeTracker.db", (err) => {
    if (err) {
        console.error("Error opening database", err);
    } else {
        db.run(
            `CREATE TABLE IF NOT EXISTS finance (
                id INTEGER PRIMARY KEY,
                incomes TEXT,
                expenses TEXT,
                bankAmount REAL DEFAULT 0
            )`,
            (err) => {
                if (err) {
                    console.error("Error creating table", err);
                }
            }
        );
    }
});




app.get("/data", basicAuth, (req, res) => {
    db.get("SELECT * FROM finance WHERE id = 1", (err, row) => {
        if (err) {
            res.status(500).json({ error: "Database error" });
        } else if (row) {
            res.json({
                incomes: JSON.parse(row.incomes),
                expenses: JSON.parse(row.expenses),
                bankAmount: row.bankAmount !== undefined ? row.bankAmount : 0
            });
        } else {
            res.json({ incomes: [], expenses: [], bankAmount: 0 });
        }
    });
});


app.post("/data", basicAuth, (req, res) => {
    const incomes = JSON.stringify(req.body.incomes || []);
    const expenses = JSON.stringify(req.body.expenses || []);
    const bankAmount = typeof req.body.bankAmount === 'number' ? req.body.bankAmount : 0;
    db.run(
        `INSERT INTO finance (id, incomes, expenses, bankAmount) VALUES (1, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET incomes=excluded.incomes, expenses=excluded.expenses, bankAmount=excluded.bankAmount`,
        [incomes, expenses, bankAmount],
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
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
