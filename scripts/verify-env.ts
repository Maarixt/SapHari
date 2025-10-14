#!/usr/bin/env ts-node

/**
 * Environment Verification Script
 * Checks that all required environment variables are present and valid
 */

import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

// Load environment variables
config();

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
  validator?: (value: string) => boolean;
  example?: string;
}

const REQUIRED_ENV_VARS: EnvVar[] = [
  {
    name: 'VITE_SUPABASE_URL',
    required: true,
    description: 'Supabase project URL',
    validator: (value) => value.startsWith('https://') && value.includes('.supabase.co'),
    example: 'https://your-project.supabase.co'
  },
  {
    name: 'VITE_SUPABASE_ANON_KEY',
    required: true,
    description: 'Supabase anonymous key',
    validator: (value) => value.length > 50 && value.startsWith('eyJ'),
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  },
  {
    name: 'VITE_MQTT_BROKER_URL',
    required: true,
    description: 'MQTT broker WebSocket URL',
    validator: (value) => value.startsWith('ws://') || value.startsWith('wss://'),
    example: 'wss://your-mqtt-broker.com:8083/mqtt'
  },
  {
    name: 'VITE_MQTT_USERNAME',
    required: false,
    description: 'MQTT broker username',
    example: 'your-mqtt-username'
  },
  {
    name: 'VITE_MQTT_PASSWORD',
    required: false,
    description: 'MQTT broker password',
    example: 'your-mqtt-password'
  },
  {
    name: 'NODE_ENV',
    required: true,
    description: 'Node.js environment',
    validator: (value) => ['development', 'production', 'test'].includes(value),
    example: 'development'
  }
];

const OPTIONAL_ENV_VARS: EnvVar[] = [
  {
    name: 'VITE_APP_VERSION',
    required: false,
    description: 'Application version',
    example: '1.0.0'
  },
  {
    name: 'VITE_APP_NAME',
    required: false,
    description: 'Application name',
    example: 'SapHari IoT Platform'
  },
  {
    name: 'VITE_DEBUG_MODE',
    required: false,
    description: 'Enable debug mode',
    validator: (value) => ['true', 'false'].includes(value.toLowerCase()),
    example: 'false'
  },
  {
    name: 'VITE_API_TIMEOUT',
    required: false,
    description: 'API request timeout in milliseconds',
    validator: (value) => !isNaN(Number(value)) && Number(value) > 0,
    example: '30000'
  }
];

class EnvVerifier {
  private errors: string[] = [];
  private warnings: string[] = [];

  verify(): boolean {
    console.log('🔍 Verifying environment configuration...\n');

    // Check for .env file
    this.checkEnvFile();

    // Verify required variables
    this.verifyRequiredVars();

    // Verify optional variables
    this.verifyOptionalVars();

    // Check for common issues
    this.checkCommonIssues();

    // Print results
    this.printResults();

    return this.errors.length === 0;
  }

  private checkEnvFile(): void {
    const envFiles = ['.env', '.env.local', '.env.development', '.env.production'];
    const foundEnvFile = envFiles.find(file => existsSync(join(process.cwd(), file)));

    if (!foundEnvFile) {
      this.warnings.push('No .env file found. Using system environment variables only.');
    } else {
      console.log(`✅ Found environment file: ${foundEnvFile}`);
    }
  }

  private verifyRequiredVars(): void {
    console.log('📋 Checking required environment variables...\n');

    REQUIRED_ENV_VARS.forEach(envVar => {
      const value = process.env[envVar.name];
      
      if (!value) {
        this.errors.push(`❌ Missing required variable: ${envVar.name}`);
        console.log(`   Description: ${envVar.description}`);
        if (envVar.example) {
          console.log(`   Example: ${envVar.example}`);
        }
        console.log('');
        return;
      }

      if (envVar.validator && !envVar.validator(value)) {
        this.errors.push(`❌ Invalid value for ${envVar.name}: ${value}`);
        console.log(`   Description: ${envVar.description}`);
        if (envVar.example) {
          console.log(`   Expected format: ${envVar.example}`);
        }
        console.log('');
        return;
      }

      console.log(`✅ ${envVar.name}: ${this.maskSensitiveValue(envVar.name, value)}`);
    });
  }

  private verifyOptionalVars(): void {
    console.log('\n📋 Checking optional environment variables...\n');

    OPTIONAL_ENV_VARS.forEach(envVar => {
      const value = process.env[envVar.name];
      
      if (!value) {
        console.log(`⚪ ${envVar.name}: Not set (optional)`);
        return;
      }

      if (envVar.validator && !envVar.validator(value)) {
        this.warnings.push(`⚠️  Invalid value for optional variable ${envVar.name}: ${value}`);
        console.log(`   Description: ${envVar.description}`);
        if (envVar.example) {
          console.log(`   Expected format: ${envVar.example}`);
        }
        return;
      }

      console.log(`✅ ${envVar.name}: ${this.maskSensitiveValue(envVar.name, value)}`);
    });
  }

  private checkCommonIssues(): void {
    console.log('\n🔍 Checking for common configuration issues...\n');

    // Check Supabase URL format
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.endsWith('/')) {
      this.warnings.push('⚠️  VITE_SUPABASE_URL should not end with a trailing slash');
    }

    // Check MQTT URL format
    const mqttUrl = process.env.VITE_MQTT_BROKER_URL;
    if (mqttUrl && !mqttUrl.includes('/mqtt')) {
      this.warnings.push('⚠️  VITE_MQTT_BROKER_URL should include the /mqtt path');
    }

    // Check for development vs production settings
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv === 'production') {
      const debugMode = process.env.VITE_DEBUG_MODE;
      if (debugMode === 'true') {
        this.warnings.push('⚠️  Debug mode is enabled in production environment');
      }
    }

    // Check for missing MQTT credentials in production
    if (nodeEnv === 'production') {
      const mqttUsername = process.env.VITE_MQTT_USERNAME;
      const mqttPassword = process.env.VITE_MQTT_PASSWORD;
      
      if (!mqttUsername || !mqttPassword) {
        this.warnings.push('⚠️  MQTT credentials are missing in production environment');
      }
    }
  }

  private maskSensitiveValue(name: string, value: string): string {
    const sensitiveVars = ['KEY', 'PASSWORD', 'SECRET', 'TOKEN'];
    const isSensitive = sensitiveVars.some(sensitive => 
      name.toUpperCase().includes(sensitive)
    );

    if (isSensitive) {
      return value.length > 8 
        ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
        : '***';
    }

    return value;
  }

  private printResults(): void {
    console.log('\n' + '='.repeat(50));
    console.log('📊 Environment Verification Results');
    console.log('='.repeat(50));

    if (this.errors.length === 0) {
      console.log('✅ All required environment variables are properly configured!');
    } else {
      console.log(`❌ Found ${this.errors.length} error(s):`);
      this.errors.forEach(error => console.log(`   ${error}`));
    }

    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Found ${this.warnings.length} warning(s):`);
      this.warnings.forEach(warning => console.log(`   ${warning}`));
    }

    console.log('\n' + '='.repeat(50));

    if (this.errors.length > 0) {
      console.log('\n💡 To fix these issues:');
      console.log('   1. Create a .env file in your project root');
      console.log('   2. Add the missing environment variables');
      console.log('   3. Restart your development server');
      console.log('\n📖 See the documentation for more details.');
    }
  }
}

// Run verification if this script is executed directly
if (require.main === module) {
  const verifier = new EnvVerifier();
  const success = verifier.verify();
  
  if (!success) {
    process.exit(1);
  }
}

export { EnvVerifier };
