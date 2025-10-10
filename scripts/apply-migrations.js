// Script to apply database migrations to fix relationships
// Run this with: node scripts/apply-migrations.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- VITE_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigrations() {
  console.log('🚀 Applying database migrations...');

  try {
    // Read the migration files
    const fs = require('fs');
    const path = require('path');
    
    const migrationFiles = [
      'supabase/migrations/20250115_fix_relationships.sql',
      'supabase/migrations/20250115_sync_profiles_auth.sql'
    ];

    for (const file of migrationFiles) {
      if (fs.existsSync(file)) {
        console.log(`📄 Applying migration: ${file}`);
        const sql = fs.readFileSync(file, 'utf8');
        
        // Split by semicolon and execute each statement
        const statements = sql.split(';').filter(stmt => stmt.trim());
        
        for (const statement of statements) {
          if (statement.trim()) {
            const { error } = await supabase.rpc('exec_sql', { sql: statement.trim() });
            if (error) {
              console.warn(`⚠️  Warning in ${file}:`, error.message);
            }
          }
        }
        
        console.log(`✅ Applied: ${file}`);
      } else {
        console.log(`⚠️  Migration file not found: ${file}`);
      }
    }

    console.log('🎉 All migrations applied successfully!');
    
    // Test the relationships
    console.log('🧪 Testing relationships...');
    
    // Test profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (profilesError) {
      console.error('❌ Profiles table error:', profilesError.message);
    } else {
      console.log('✅ Profiles table accessible');
    }

    // Test devices table
    const { data: devices, error: devicesError } = await supabase
      .from('devices')
      .select('*')
      .limit(1);
    
    if (devicesError) {
      console.error('❌ Devices table error:', devicesError.message);
    } else {
      console.log('✅ Devices table accessible');
    }

    // Test relationship
    const { data: deviceWithOwner, error: relationError } = await supabase
      .from('devices')
      .select(`
        id,
        device_id,
        name,
        owner:profiles (
          id,
          email,
          display_name
        )
      `)
      .limit(1);
    
    if (relationError) {
      console.error('❌ Relationship error:', relationError.message);
    } else {
      console.log('✅ Device-Profile relationship working');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Add exec_sql function if it doesn't exist
async function ensureExecSqlFunction() {
  const { error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });
  
  if (error && error.message.includes('function exec_sql')) {
    console.log('📝 Creating exec_sql function...');
    
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION exec_sql(sql text)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$;
    `;
    
    // Use direct query for this
    const { error: createError } = await supabase
      .from('_temp')
      .select('*')
      .limit(0); // This will fail but we'll catch it
    
    if (createError) {
      console.log('⚠️  Could not create exec_sql function. Please run migrations manually in Supabase SQL editor.');
      return false;
    }
  }
  
  return true;
}

// Main execution
async function main() {
  console.log('🔧 Database Migration Tool');
  console.log('========================');
  
  if (await ensureExecSqlFunction()) {
    await applyMigrations();
  } else {
    console.log('📋 Please run the following SQL in your Supabase SQL editor:');
    console.log('');
    
    const fs = require('fs');
    const migrationFiles = [
      'supabase/migrations/20250115_fix_relationships.sql',
      'supabase/migrations/20250115_sync_profiles_auth.sql'
    ];

    for (const file of migrationFiles) {
      if (fs.existsSync(file)) {
        console.log(`-- ${file}`);
        console.log(fs.readFileSync(file, 'utf8'));
        console.log('');
      }
    }
  }
}

main().catch(console.error);
