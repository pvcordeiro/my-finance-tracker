#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, 'financeTracker.db');
const outputPath = path.join(__dirname, 'converted-finance-data.json');

try {
    console.log('Converting database to JSON format...');
    
    // Use sqlite3 command to extract data
    const sqlCommand = `sqlite3 "${dbPath}" "SELECT months, bankAmount FROM finance WHERE id = 1;"`;
    const result = execSync(sqlCommand, { encoding: 'utf8' }).trim();
    
    if (!result) {
        console.error('No data found in the database');
        process.exit(1);
    }
    
    // Parse the result (format: months_json|bankAmount)
    const parts = result.split('|');
    if (parts.length < 2) {
        console.error('Unexpected database format');
        process.exit(1);
    }
    
    const monthsJson = parts[0];
    const bankAmount = parseFloat(parts[1]) || 0;
    
    console.log('Parsing months data...');
    
    // Parse the months JSON data
    let monthsData;
    try {
        monthsData = JSON.parse(monthsJson);
    } catch (error) {
        console.error('Error parsing months JSON:', error);
        console.error('Raw data:', monthsJson);
        process.exit(1);
    }
    
    // Convert to the target format
    // Use bank amount from JSON data if available, otherwise fall back to database column
    const finalBankAmount = monthsData.bankAmount !== undefined ? monthsData.bankAmount : bankAmount;
    
    const convertedData = {
        bankAmount: finalBankAmount,
        incomes: [],
        expenses: []
    };
    
    // Convert incomes
    if (monthsData.incomes && Array.isArray(monthsData.incomes)) {
        convertedData.incomes = monthsData.incomes.map((income, index) => ({
            id: String(index + 1), // Generate sequential IDs starting from 1
            description: income.description,
            amounts: income.amounts.map(amount => {
                // Convert empty strings or null to 0
                if (amount === "" || amount === null || amount === undefined) {
                    return 0;
                }
                // Ensure it's a number
                return typeof amount === 'number' ? amount : parseFloat(amount) || 0;
            })
        }));
    }
    
    // Convert expenses
    if (monthsData.expenses && Array.isArray(monthsData.expenses)) {
        convertedData.expenses = monthsData.expenses.map((expense, index) => ({
            id: String(index + 1), // Generate sequential IDs starting from 1
            description: expense.description,
            amounts: expense.amounts.map(amount => {
                // Convert empty strings or null to 0
                if (amount === "" || amount === null || amount === undefined) {
                    return 0;
                }
                // Ensure it's a number
                return typeof amount === 'number' ? amount : parseFloat(amount) || 0;
            })
        }));
    }
    
    // Write the converted data to a JSON file
    fs.writeFileSync(outputPath, JSON.stringify(convertedData, null, 2));
    
    console.log('✅ Conversion completed successfully!');
    console.log(`📁 Output written to: ${outputPath}`);
    console.log('\n📊 Converted data summary:');
    console.log(`💰 Bank Amount: ${convertedData.bankAmount}`);
    console.log(`📈 Incomes: ${convertedData.incomes.length} entries`);
    console.log(`📉 Expenses: ${convertedData.expenses.length} entries`);
    
    // Show preview of first few entries
    if (convertedData.incomes.length > 0) {
        console.log('\n📈 Income entries:');
        convertedData.incomes.slice(0, 3).forEach(income => {
            console.log(`  - ${income.description} (ID: ${income.id})`);
        });
        if (convertedData.incomes.length > 3) {
            console.log(`  ... and ${convertedData.incomes.length - 3} more`);
        }
    }
    
    if (convertedData.expenses.length > 0) {
        console.log('\n📉 Expense entries:');
        convertedData.expenses.slice(0, 3).forEach(expense => {
            console.log(`  - ${expense.description} (ID: ${expense.id})`);
        });
        if (convertedData.expenses.length > 3) {
            console.log(`  ... and ${convertedData.expenses.length - 3} more`);
        }
    }
    
} catch (error) {
    console.error('❌ Error during conversion:', error.message);
    process.exit(1);
}
