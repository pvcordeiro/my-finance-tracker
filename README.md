# Another Personal Finance Tracker

A simple, mobile-friendly personal finance tracker built with Node.js, Express, and SQLite. Track your income, expenses, and balances with a clean, responsive UI.

## Setup

1. Clone the repository
2. Run `npm install`
3. Create a `.env` file with the following variables:
   ```
   FINANCE_USER=yourusername
   FINANCE_PASS=yourpassword
   SESSION_SECRET=your_session_secret
   ```
4. Start the server: `node server.js`
5. Visit `http://localhost:3000` in your browser

## File Structure

- `index.html`, `details.html`, `edit.html`, `login.html`: Main pages
- `styles.css`: All global and page-specific styles (for now)
- `script.js`, `summary.js`, `details.js`, `edit.js`, `login.js`, `index.js`: Page logic
- `server.js`: Express backend, authentication, API, and routing
- `financeTracker.db`: SQLite database

## Security

- Credentials and session secret are stored in `.env` (do not commit this file)
- Database file is ignored by git
- Session-based authentication with secure login page


## Features

- **Add/Edit/Delete Incomes and Expenses** for each month
- **Bank Amount**: Track your real bank balance alongside monthly entries
- **Summary and Details Views**: See annual summaries and detailed breakdowns
- **Responsive Design**: Optimized for phones, tablets, and desktops
- **Sticky Columns**: Easy-to-read tables with sticky month/description columns
- **Save Button UX**: Save button appears only when changes are made
- **Secure**: Credentials and database stored locally on your server
- **.env Support**: Store sensitive config in `.env`
- **Modern UI**: Clean, beautiful, and easy to use

---

This is an ongoing project, since I use it myself by hosting it on a raspberry pi.  
So it'll be probably updated regularly. 

TODO: organize folder structure, more features, improve design, maybe move it to a framework.

## License
MIT

---

Made with ❤️ for personal and family finance management.
