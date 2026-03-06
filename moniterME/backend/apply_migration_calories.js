const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env' });

const connectionString = process.env.DATABASE_URL;

async function run() {
    const pool = new Pool({
        connectionString,
        ssl: false
    });

    try {
        const sqlPath = path.join(__dirname, '../database/workout_calories.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('Applying calorie migration...');
        await pool.query(sql);
        console.log('Migration applied successfully!');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        await pool.end();
    }
}

run();
