const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env' });

// Manually parse DATABASE_URL to avoid SASL issues if it's the culprit
const connectionString = process.env.DATABASE_URL;

async function run() {
    const pool = new Pool({
        connectionString,
        ssl: false // Set to true if needed, but for local it's usually false
    });

    try {
        const sqlPath = path.join(__dirname, '../database/user_onboarding.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('Applying onboarding migration...');
        await pool.query(sql);
        console.log('Migration applied successfully!');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        await pool.end();
    }
}

run();
