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
                months TEXT
            )`,
            (err) => {
                if (err) {
                    console.error("Error creating table", err);
                }
            }
        );

        // --- MIGRATION: Convert old flat data to new per-month format if needed ---
        db.get("SELECT months FROM finance WHERE id = 1", (err, row) => {
            if (!err && row && row.months) {
                try {
                    const data = JSON.parse(row.months);
                    // If old format (flat incomes/expenses/bankAmount), migrate
                    if (data && (Array.isArray(data.incomes) || Array.isArray(data.expenses) || typeof data.bankAmount === 'number')) {
                        // Use current year-month as key
                        const now = new Date();
                        const ym = `${now.getFullYear()}-${('0'+(now.getMonth()+1)).slice(-2)}`;
                        const newData = {};
                        newData[ym] = {
                            incomes: data.incomes || [],
                            expenses: data.expenses || [],
                            bankAmount: typeof data.bankAmount === 'number' ? data.bankAmount : 0
                        };
                        db.run("UPDATE finance SET months = ? WHERE id = 1", [JSON.stringify(newData)]);
                        console.log("[MIGRATION] Converted flat data to per-month format.");
                    }
                } catch (e) { /* ignore */ }
            }
        });
    }
});




app.get("/data", basicAuth, (req, res) => {
    db.get("SELECT months FROM finance WHERE id = 1", (err, row) => {
        if (err) {
            res.status(500).json({ error: "Database error" });
        } else if (row && row.months) {
            try {
                res.json(JSON.parse(row.months));
            } catch (e) {
                res.status(500).json({ error: "Corrupt data" });
            }
        } else {
            res.json({}); // No data yet
        }
    });
});


app.post("/data", basicAuth, (req, res) => {
    // Expecting req.body to be the full months object: { "2025-07": { incomes: [...], expenses: [...], bankAmount: ... }, ... }
    const months = JSON.stringify(req.body || {});
    db.run(
        `UPDATE finance SET months = ? WHERE id = 1`,
        [months],
        function (err) {
            if (err) {
                console.error("DB UPDATE error:", err);
                return res.status(500).json({ error: "Database error (update)" });
            }
            if (this.changes === 0) {
                // No row updated, insert new
                db.run(
                    `INSERT INTO finance (id, months) VALUES (1, ?)`,
                    [months],
                    function (err2) {
                        if (err2) {
                            console.error("DB INSERT error:", err2);
                            return res.status(500).json({ error: "Database error (insert)" });
                        }
                        res.status(200).json({ message: "Data saved successfully! (insert)" });
                    }
                );
            } else {
                res.status(200).json({ message: "Data saved successfully! (update)" });
            }
        }
    );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
