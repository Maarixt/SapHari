#!/usr/bin/env node

/**
 * Fix Master Access Script
 * This script applies the master access fixes and verifies the setup
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://wrdeomgtkbehvbfhiprm.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function applyMigration() {
  console.log('🔄 Applying master access fixes...');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250116_fix_master_access.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Apply the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('❌ Error applying migration:', error);
      return false;
    }
    
    console.log('✅ Migration applied successfully');
    return true;
  } catch (err) {
    console.error('❌ Error reading migration file:', err);
    return false;
  }
}

async function verifyMasterRole() {
  console.log('🔍 Verifying master role setup...');
  
  try {
    // Check if user_roles table exists and has data
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select('*')
      .limit(5);
    
    if (userRolesError) {
      console.log('⚠️  user_roles table error:', userRolesError.message);
    } else {
      console.log('📊 User roles found:', userRoles?.length || 0);
      if (userRoles && userRoles.length > 0) {
        console.log('   Master roles:', userRoles.filter(r => r.role === 'master').length);
      }
    }
    
    // Check profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, display_name')
      .limit(5);
    
    if (profilesError) {
      console.log('⚠️  profiles table error:', profilesError.message);
    } else {
      console.log('👥 Profiles found:', profiles?.length || 0);
      if (profiles && profiles.length > 0) {
        console.log('   Users:', profiles.map(p => p.email || p.display_name).join(', '));
      }
    }
    
    // Test the is_master_user function
    const { data: masterCheck, error: masterCheckError } = await supabase
      .rpc('is_master_user');
    
    if (masterCheckError) {
      console.log('⚠️  Master check function error:', masterCheckError.message);
    } else {
      console.log('🔐 Master check result:', masterCheck);
    }
    
    return true;
  } catch (err) {
    console.error('❌ Error verifying master role:', err);
    return false;
  }
}

async function assignMasterRole() {
  console.log('👑 Checking if master role needs to be assigned...');
  
  try {
    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, display_name');
    
    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      return false;
    }
    
    if (!profiles || profiles.length === 0) {
      console.log('⚠️  No profiles found');
      return false;
    }
    
    // Check if any user has master role
    const { data: masterRoles, error: masterRolesError } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .eq('role', 'master');
    
    if (masterRolesError) {
      console.log('⚠️  Error checking master roles:', masterRolesError.message);
    }
    
    const hasMasterRole = masterRoles && masterRoles.length > 0;
    
    if (!hasMasterRole) {
      console.log('🔧 No master role found. Assigning master role to first user...');
      
      const firstUser = profiles[0];
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: firstUser.id,
          role: 'master'
        });
      
      if (insertError) {
        console.error('❌ Error assigning master role:', insertError);
        return false;
      }
      
      console.log(`✅ Master role assigned to: ${firstUser.email || firstUser.display_name}`);
    } else {
      console.log('✅ Master role already exists');
      console.log('   Master users:', masterRoles.map(r => r.user_id).join(', '));
    }
    
    return true;
  } catch (err) {
    console.error('❌ Error assigning master role:', err);
    return false;
  }
}

async function testProfilesAccess() {
  console.log('🧪 Testing profiles access...');
  
  try {
    // Test profiles access (this should work now)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, display_name, created_at')
      .order('created_at', { ascending: false });
    
    if (profilesError) {
      console.error('❌ Profiles access test failed:', profilesError);
      return false;
    }
    
    console.log('✅ Profiles access test passed');
    console.log(`   Found ${profiles.length} profiles:`);
    profiles.forEach(profile => {
      console.log(`   - ${profile.display_name || profile.email} (${profile.id})`);
    });
    
    return true;
  } catch (err) {
    console.error('❌ Error testing profiles access:', err);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Master Access Fix...\n');
  
  // Step 1: Apply migration
  const migrationSuccess = await applyMigration();
  if (!migrationSuccess) {
    console.log('❌ Migration failed. Exiting.');
    process.exit(1);
  }
  
  console.log('');
  
  // Step 2: Verify master role setup
  await verifyMasterRole();
  
  console.log('');
  
  // Step 3: Assign master role if needed
  await assignMasterRole();
  
  console.log('');
  
  // Step 4: Test profiles access
  const testSuccess = await testProfilesAccess();
  
  console.log('');
  
  if (testSuccess) {
    console.log('🎉 Master Access Fix completed successfully!');
    console.log('   The Users tab should now work properly.');
  } else {
    console.log('⚠️  Master Access Fix completed with warnings.');
    console.log('   Please check the output above for any issues.');
  }
}

// Run the script
main().catch(console.error);
