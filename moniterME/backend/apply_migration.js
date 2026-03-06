const pool = require('./config/database');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        const sqlPath = path.join(__dirname, '../database/workout_v2.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('Applying migration from:', sqlPath);

        // Split by semicolon and run each query if it's large, but pool.query can usually handle multiple statements if supported by driver
        // For simplicity, we'll try running the whole block
        await pool.query(sql);
        console.log('Migration applied successfully!');

        const tables = await pool.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'");
        console.log('Existing tables:', tables.rows.map(r => r.tablename));
    } catch (err) {
        console.error('Migration failed:', err.message);
        console.error(err.stack);
    } finally {
        await pool.end();
    }
}

run();
