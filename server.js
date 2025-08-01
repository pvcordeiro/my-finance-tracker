require('dotenv').config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const cookieParser = require('cookie-parser');


const path = require("path");
const app = express();
app.get('/edit.html', (req, res) => res.redirect(301, '/edit'));
app.get('/details.html', (req, res) => res.redirect(301, '/details'));
app.get('/login.html', (req, res) => res.redirect(301, '/login'));
app.get('/index.html', (req, res) => res.redirect(301, '/index'));
app.use(cors());
app.use(bodyParser.json());
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
    throw new Error('SESSION_SECRET is not set. Please add it to your .env file.');
}

const db = new sqlite3.Database("./financeTracker.db", (err) => {
    if (err)
        console.error("Error opening database", err);
    else
    {
        db.run(
            `CREATE TABLE IF NOT EXISTS finance (
                id INTEGER PRIMARY KEY,
                months TEXT
            )`,
            (err) => {
                if (err)
                    console.error("Error creating table", err);
            }
        );
    }
});

function requireLogin(req, res, next)
{
    if (req.cookies && req.cookies.session && req.cookies.session === SESSION_SECRET)
        return next();
    res.status(401).json({ error: 'Not authenticated' });
}

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.FINANCE_USER && password === process.env.FINANCE_PASS)
    {
        res.cookie('session', SESSION_SECRET, { httpOnly: true, sameSite: 'lax' });
        return res.status(200).json({ message: 'Login successful' });
    }
    res.status(401).json({ error: 'Invalid credentials' });
});

app.get("/data", requireLogin, (req, res) => {
    db.get("SELECT months FROM finance WHERE id = 1", (err, row) => {
        if (err)
            return res.status(500).json({ error: "Database error" });
        if (row && row.months)
        {
            try {
                res.json(JSON.parse(row.months));
            } catch (e) {
                res.status(500).json({ error: "Corrupt data" });
            }
        }
        else
            res.json({ incomes: [], expenses: [], bankAmount: 0 });
    });
});

app.post("/data", requireLogin, (req, res) => {
    const dataObj = req.body || { incomes: [], expenses: [], bankAmount: 0 };
    const dataStr = JSON.stringify(dataObj);
    db.run(
        `UPDATE finance SET months = ? WHERE id = 1`,
        [dataStr],
        function (err)
        {
            if (err)
            {
                console.error("DB UPDATE error:", err);
                return res.status(500).json({ error: "Database error (update)" });
            }
            if (this.changes === 0)
            {
                db.run(
                    `INSERT INTO finance (id, months) VALUES (1, ?)`,
                    [dataStr],
                    function (err2)
                    {
                        if (err2)
                        {
                            console.error("DB INSERT error:", err2);
                            return res.status(500).json({ error: "Database error (insert)" });
                        }
                        res.status(200).json({ message: "Data saved successfully! (insert)" });
                    }
                );
            }
            else
                res.status(200).json({ message: "Data saved successfully! (update)" });
        }
    );
});

const PORT = process.env.PORT || 3000;
app.get('/edit', (req, res) => res.sendFile(path.join(__dirname, 'edit.html')));
app.get('/details', (req, res) => res.sendFile(path.join(__dirname, 'details.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/index', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
