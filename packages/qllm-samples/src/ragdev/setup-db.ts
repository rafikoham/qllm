import { Pool } from 'pg';

async function setupDatabase() {
    // First connect to the default 'postgres' database to create our database
    const pool = new Pool({
        user: 'postgres',
        host: '127.0.0.1',
        database: 'postgres', // Connect to default database first
        port: 5433,
        password: 'adonis2000'
    });

    try {
        // Check if database exists
        const dbCheckResult = await pool.query(
            "SELECT 1 FROM pg_database WHERE datname = 'rag'"
        );

        // Create database if it doesn't exist
        if (dbCheckResult.rows.length === 0) {
            console.log('Creating database "rag"...');
            await pool.query('CREATE DATABASE rag');
            console.log('Database created successfully');
        } else {
            console.log('Database "rag" already exists');
        }

        // Close connection to postgres database
        await pool.end();

        // Connect to our new database to set up extensions and tables
        const ragPool = new Pool({
            user: 'postgres',
            host: '127.0.0.1',
            database: 'rag',
            port: 5433,
            password: 'adonis2000'
        });

        try {
            // Try to install vector extension using CREATE EXTENSION
            console.log('Installing vector extension...');
            try {
                await ragPool.query(`
                    CREATE EXTENSION IF NOT EXISTS vector;
                `);
                console.log('Vector extension installed successfully');
            } catch (error) {
                console.error('Failed to install vector extension. Please install it manually:');
                console.log('1. Open pgAdmin 4');
                console.log('2. Right-click on your database');
                console.log('3. Select Query Tool');
                console.log('4. Run: CREATE EXTENSION vector;');
                // Continue with table creation anyway
            }

            // Create documents table
            console.log('Creating documents table...');
            await ragPool.query(`
                CREATE TABLE IF NOT EXISTS documents (
                    id TEXT PRIMARY KEY,
                    content TEXT,
                    metadata JSONB,
                    embedding VECTOR(1536)
                )
            `);
            console.log('Documents table created successfully');

            console.log('Database setup completed successfully!');
        } finally {
            await ragPool.end();
        }
    } catch (error) {
        console.error('Error setting up database:', error);
        throw error;
    }
}

console.log('Starting database setup...');
setupDatabase().catch(console.error);
