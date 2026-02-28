#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials. Please check your .env file.');
    console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyArtistModeMigration() {
    try {
        console.log('Applying artist mode migration...');
        
        // Check if artist_mode_enabled column exists
        const { data: columns, error: columnError } = await supabase
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_name', 'users')
            .eq('column_name', 'artist_mode_enabled');

        if (columnError) {
            throw columnError;
        }

        if (columns && columns.length > 0) {
            console.log('✅ artist_mode_enabled column already exists');
        } else {
            console.log('Adding artist_mode_enabled column...');
            const { error: addColumnError } = await supabase.rpc('exec_sql', {
                sql: 'ALTER TABLE users ADD COLUMN artist_mode_enabled BOOLEAN DEFAULT FALSE;'
            });

            if (addColumnError) {
                throw addColumnError;
            }
            console.log('✅ artist_mode_enabled column added successfully');
        }

        // Check if experience column exists
        const { data: expColumns, error: expColumnError } = await supabase
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_name', 'users')
            .eq('column_name', 'experience');

        if (expColumnError) {
            throw expColumnError;
        }

        if (expColumns && expColumns.length > 0) {
            console.log('✅ experience column already exists');
        } else {
            console.log('Adding experience column...');
            const { error: addExpColumnError } = await supabase.rpc('exec_sql', {
                sql: 'ALTER TABLE users ADD COLUMN experience INTEGER DEFAULT 0;'
            });

            if (addExpColumnError) {
                throw addExpColumnError;
            }
            console.log('✅ experience column added successfully');
        }

        // Check if artist_mode_sessions table exists
        const { data: tables, error: tableError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .eq('table_name', 'artist_mode_sessions');

        if (tableError) {
            throw tableError;
        }

        if (tables && tables.length > 0) {
            console.log('✅ artist_mode_sessions table already exists');
        } else {
            console.log('Creating artist_mode_sessions table...');
            const { error: createTableError } = await supabase.rpc('exec_sql', {
                sql: `
                    CREATE TABLE artist_mode_sessions (
                        id SERIAL PRIMARY KEY,
                        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                        start_time TIMESTAMP DEFAULT NOW(),
                        created_at TIMESTAMP DEFAULT NOW()
                    );
                `
            });

            if (createTableError) {
                throw createTableError;
            }
            console.log('✅ artist_mode_sessions table created successfully');
        }

        console.log('🎉 Artist mode migration completed successfully!');
    } catch (error) {
        console.error('❌ Error applying migration:', error);
        process.exit(1);
    }
}

// Alternative method using raw SQL execution
async function applyMigrationWithRawSQL() {
    try {
        console.log('Applying artist mode migration using raw SQL...');
        
        // First, try adding the columns
        const sql = `
        DO $$
        BEGIN
            -- Add artist_mode_enabled column if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'artist_mode_enabled'
            ) THEN
                ALTER TABLE users ADD COLUMN artist_mode_enabled BOOLEAN DEFAULT FALSE;
            END IF;
            
            -- Add experience column if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'experience'
            ) THEN
                ALTER TABLE users ADD COLUMN experience INTEGER DEFAULT 0;
            END IF;
            
            -- Create artist_mode_sessions table if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'artist_mode_sessions'
            ) THEN
                CREATE TABLE artist_mode_sessions (
                    id SERIAL PRIMARY KEY,
                    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                    start_time TIMESTAMP DEFAULT NOW(),
                    created_at TIMESTAMP DEFAULT NOW()
                );
            END IF;
        END
        $$;
        `;

        const { error } = await supabase.rpc('exec_sql', { sql });
        
        if (error) {
            throw error;
        }

        console.log('🎉 Artist mode migration completed successfully using raw SQL!');
    } catch (error) {
        console.error('❌ Error applying migration with raw SQL:', error);
        console.log('\nTrying alternative approach...');
        await applyMigrationDirectly();
    }
}

// Direct approach using individual queries
async function applyMigrationDirectly() {
    try {
        console.log('Applying migration with direct SQL execution...');
        
        // Add artist_mode_enabled column
        try {
            const { error: col1Error } = await supabase.rpc('exec_sql', {
                sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS artist_mode_enabled BOOLEAN DEFAULT FALSE;'
            });
            if (col1Error && !col1Error.message.includes('already exists')) {
                throw col1Error;
            }
            console.log('✅ artist_mode_enabled column handled');
        } catch (err) {
            if (!err.message.includes('already exists')) {
                throw err;
            }
            console.log('✅ artist_mode_enabled column already exists');
        }

        // Add experience column
        try {
            const { error: col2Error } = await supabase.rpc('exec_sql', {
                sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS experience INTEGER DEFAULT 0;'
            });
            if (col2Error && !col2Error.message.includes('already exists')) {
                throw col2Error;
            }
            console.log('✅ experience column handled');
        } catch (err) {
            if (!err.message.includes('already exists')) {
                throw err;
            }
            console.log('✅ experience column already exists');
        }

        // Create artist_mode_sessions table
        try {
            const { error: tableError } = await supabase.rpc('exec_sql', {
                sql: `
                    CREATE TABLE IF NOT EXISTS artist_mode_sessions (
                        id SERIAL PRIMARY KEY,
                        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                        start_time TIMESTAMP DEFAULT NOW(),
                        created_at TIMESTAMP DEFAULT NOW()
                    );
                `
            });
            if (tableError) {
                throw tableError;
            }
            console.log('✅ artist_mode_sessions table created/verified');
        } catch (err) {
            if (!err.message.includes('already exists')) {
                throw err;
            }
            console.log('✅ artist_mode_sessions table already exists');
        }

        console.log('🎉 Artist mode migration completed successfully!');
    } catch (error) {
        console.error('❌ Error in direct migration:', error);
        console.log('\n📋 Please manually run the following SQL in your Supabase dashboard:');
        console.log(`
-- Add artist_mode_enabled column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS artist_mode_enabled BOOLEAN DEFAULT FALSE;

-- Add experience column to users table  
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS experience INTEGER DEFAULT 0;

-- Create artist_mode_sessions table
CREATE TABLE IF NOT EXISTS artist_mode_sessions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);
        `);
    }
}

if (require.main === module) {
    applyMigrationWithRawSQL();
}

module.exports = { applyArtistModeMigration, applyMigrationWithRawSQL, applyMigrationDirectly };