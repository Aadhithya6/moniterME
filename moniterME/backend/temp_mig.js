const pool = require('./config/database');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function run() {
    try {
        const sqlPath = path.join(__dirname, '../database/user_onboarding.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('Applying migration from:', sqlPath);
        await pool.query(sql);
        console.log('Migration applied!');
    } catch (err) {
        console.error('Failed:', err.message);
    } finally {
        await pool.end();
    }
}
run();
