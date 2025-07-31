# Another Personal Finance Tracker

A modern, mobile-friendly, and secure personal finance tracker for managing incomes, expenses, and bank balances. Designed for easy use on both desktop and mobile devices.

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

## Getting Started

### Prerequisites
- Node.js (v16+ recommended)
- npm

### Installation
1. Clone the repository:
   ```sh
   git clone https://github.com/yourusername/another-personal-finance-tracker.git
   cd another-personal-finance-tracker
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Create a `.env` file for your secrets (see `.env.example` if available).
4. Start the server:
   ```sh
   node server.js
   ```
5. Open `http://localhost:3000` in your browser.

## Project Structure

- `server.js` — Express backend, serves API and static files
- `financeTracker.db` — SQLite database
- `index.html` — Summary page
- `edit.html` — Main data entry page
- `details.html` — Detailed breakdown page
- `styles.css` — All site styles
- `script.js` — Main frontend logic for edit page
- `summary.js`, `details.js` — Logic for summary/details pages

## Security
- `.env` and `financeTracker.db` are in `.gitignore` and not tracked
- Credentials and sensitive data should be stored in `.env`

## Customization
- Adjust styles in `styles.css` for your branding
- Add new features or tweak UI as needed

---

This is an ongoing project, since I use it myself by hosting it on a raspberry pi.  
So it'll be probably updated regularly. 

TODO: a proper login screen, more features, improve design, maybe change it to a framework.

## License
MIT

---

Made with ❤️ for personal and family finance management.
