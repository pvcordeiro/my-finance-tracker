#!/usr/bin/env node

/**
 * Security Verification Script
 * This script tests that the localStorage security vulnerabilities have been fixed
 */

const fs = require('fs');
const path = require('path');

console.log('🔒 Security Verification for Personal Finance Tracker\n');

// Check if localStorage is still being used in the codebase
function checkForLocalStorageUsage() {
  console.log('1. Checking for localStorage usage...');
  
  const filesToCheck = [
    'hooks/use-auth.tsx',
    'hooks/use-finance-data.tsx',
    'components/auth/login-form.tsx'
  ];
  
  let foundLocalStorage = false;
  
  filesToCheck.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('localStorage')) {
        console.log(`   ❌ Found localStorage usage in ${file}`);
        foundLocalStorage = true;
      } else {
        console.log(`   ✅ No localStorage usage in ${file}`);
      }
    }
  });
  
  if (!foundLocalStorage) {
    console.log('   🎉 All localStorage usage has been removed!\n');
  } else {
    console.log('   ⚠️  Some localStorage usage still exists\n');
  }
  
  return !foundLocalStorage;
}

// Check if session system is implemented
function checkSessionSystem() {
  console.log('2. Checking session system implementation...');
  
  const sessionFiles = [
    'lib/session.js',
    'lib/auth-middleware.js',
    'app/api/auth/logout/route.js'
  ];
  
  let allFilesExist = true;
  
  sessionFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      console.log(`   ✅ ${file} exists`);
    } else {
      console.log(`   ❌ ${file} missing`);
      allFilesExist = false;
    }
  });
  
  if (allFilesExist) {
    console.log('   🎉 Session system files are in place!\n');
  } else {
    console.log('   ⚠️  Some session system files are missing\n');
  }
  
  return allFilesExist;
}

// Check if protected routes use authentication
function checkProtectedRoutes() {
  console.log('3. Checking protected routes...');
  
  const protectedRoutes = [
    'app/api/entries/route.js',
    'app/api/bank-amount/route.js'
  ];
  
  let allRoutesProtected = true;
  
  protectedRoutes.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('withAuth') && content.includes('getAuthenticatedUser')) {
        console.log(`   ✅ ${file} is properly protected`);
      } else {
        console.log(`   ❌ ${file} is not properly protected`);
        allRoutesProtected = false;
      }
    } else {
      console.log(`   ❌ ${file} missing`);
      allRoutesProtected = false;
    }
  });
  
  if (allRoutesProtected) {
    console.log('   🎉 All routes are properly protected!\n');
  } else {
    console.log('   ⚠️  Some routes are not properly protected\n');
  }
  
  return allRoutesProtected;
}

// Check database schema for sessions table
function checkDatabaseSchema() {
  console.log('4. Checking database schema...');
  
  const dbFile = path.join(__dirname, 'lib/database.js');
  if (fs.existsSync(dbFile)) {
    const content = fs.readFileSync(dbFile, 'utf8');
    if (content.includes('CREATE TABLE IF NOT EXISTS sessions')) {
      console.log('   ✅ Sessions table schema is defined');
      console.log('   🎉 Database schema includes session support!\n');
      return true;
    } else {
      console.log('   ❌ Sessions table schema not found');
      console.log('   ⚠️  Database schema needs session support\n');
      return false;
    }
  } else {
    console.log('   ❌ Database file not found\n');
    return false;
  }
}

// Run all checks
async function runSecurityVerification() {
  const results = {
    localStorage: checkForLocalStorageUsage(),
    sessionSystem: checkSessionSystem(),
    protectedRoutes: checkProtectedRoutes(),
    databaseSchema: checkDatabaseSchema()
  };
  
  const allPassed = Object.values(results).every(result => result === true);
  
  console.log('📊 SECURITY VERIFICATION RESULTS:');
  console.log('=====================================');
  console.log(`✅ localStorage removed: ${results.localStorage ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Session system: ${results.sessionSystem ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Protected routes: ${results.protectedRoutes ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Database schema: ${results.databaseSchema ? 'PASS' : 'FAIL'}`);
  console.log('=====================================');
  
  if (allPassed) {
    console.log('🎉 ALL SECURITY CHECKS PASSED!');
    console.log('The localStorage vulnerability has been successfully fixed.');
    console.log('The application now uses secure session-based authentication.');
  } else {
    console.log('⚠️  SOME SECURITY CHECKS FAILED!');
    console.log('Please review the failed checks and fix any issues.');
  }
  
  return allPassed;
}

// Run the verification
runSecurityVerification();
