/**
 * Script to run the shift_templates migration directly on the database
 * This removes the CHECK constraint that limits labels to only 'DAY' and 'NIGHT'
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runMigration() {
  console.log('🚀 Running migration: 0004_custom_shift_templates.sql');
  console.log('');

  try {
    // Step 1: Drop CHECK constraint
    console.log('1️⃣  Dropping CHECK constraint on shift_templates.label...');
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE "public"."shift_templates" DROP CONSTRAINT IF EXISTS "shift_templates_label_check";'
    });

    if (error1) {
      console.warn('⚠️  Could not drop CHECK constraint (might not exist):', error1.message);
    } else {
      console.log('✅ CHECK constraint dropped');
    }

    // Step 2: Drop old unique constraint
    console.log('2️⃣  Dropping old UNIQUE constraint...');
    const { error: error2 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE "public"."shift_templates" DROP CONSTRAINT IF EXISTS "shift_templates_station_id_label_key";'
    });

    if (error2) {
      console.warn('⚠️  Could not drop UNIQUE constraint (might not exist):', error2.message);
    } else {
      console.log('✅ UNIQUE constraint dropped');
    }

    // Step 3: Re-add unique constraint
    console.log('3️⃣  Adding back UNIQUE constraint...');
    const { error: error3 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE "public"."shift_templates" ADD CONSTRAINT "shift_templates_station_id_label_key" UNIQUE ("station_id", "label");'
    });

    if (error3) {
      console.warn('⚠️  Could not add UNIQUE constraint:', error3.message);
    } else {
      console.log('✅ UNIQUE constraint added');
    }

    console.log('');
    console.log('✨ Migration completed!');
    console.log('You can now create custom shift templates with any name.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
