const { Pool } = require('./backend/config/database');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function run() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'database/workout_v2.sql'), 'utf8');
        console.log('Applying migration...');
        await pool.query(sql);
        console.log('Migration applied successfully!');

        const tables = await pool.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'");
        console.log('Existing tables:', tables.rows.map(r => r.tablename));
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        await pool.end();
    }
}

run();
