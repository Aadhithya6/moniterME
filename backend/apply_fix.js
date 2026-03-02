const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
    user: 'postgres',
    password: 'A@dhi2006',
    host: 'localhost',
    database: 'healthyfi',
    port: 5432
});

async function run() {
    try {
        const sqlPath = path.join(__dirname, '../database/workout_v2.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
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
