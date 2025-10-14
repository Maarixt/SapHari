/**
 * Schema Migration System for Circuit Simulation
 * Handles versioning and migration of saved circuit files
 */

import { CircuitSchema, SimComponent, Wire } from './types';

export interface Migration {
  fromVersion: string;
  toVersion: string;
  migrate: (data: any) => any;
}

export class SchemaMigrator {
  private migrations: Migration[] = [];
  private currentVersion: string = '1.0.0';

  constructor() {
    this.registerMigrations();
  }

  /**
   * Register all available migrations
   */
  private registerMigrations(): void {
    // Migration from 0.9.0 to 1.0.0
    this.migrations.push({
      fromVersion: '0.9.0',
      toVersion: '1.0.0',
      migrate: (data: any) => this.migrateFrom090To100(data)
    });

    // Migration from 1.0.0 to 1.1.0
    this.migrations.push({
      fromVersion: '1.0.0',
      toVersion: '1.1.0',
      migrate: (data: any) => this.migrateFrom100To110(data)
    });

    // Add more migrations as needed
  }

  /**
   * Migrate circuit data to current version
   */
  migrate(data: any): CircuitSchema {
    if (!data.version) {
      // Assume legacy format, start from 0.9.0
      data.version = '0.9.0';
    }

    let currentData = { ...data };
    let currentVersion = data.version;

    // Apply migrations in sequence
    while (currentVersion !== this.currentVersion) {
      const migration = this.migrations.find(m => m.fromVersion === currentVersion);
      if (!migration) {
        throw new Error(`No migration found from version ${currentVersion}`);
      }

      currentData = migration.migrate(currentData);
      currentData.version = migration.toVersion;
      currentVersion = migration.toVersion;
    }

    return currentData as CircuitSchema;
  }

  /**
   * Migrate from 0.9.0 to 1.0.0
   * - Add schemaVersion field
   * - Add metadata structure
   * - Standardize component structure
   */
  private migrateFrom090To100(data: any): any {
    const migrated = {
      version: '1.0.0',
      components: data.components || [],
      wires: data.wires || [],
      metadata: {
        name: data.name || 'Untitled Circuit',
        description: data.description || '',
        created: data.created || Date.now(),
        modified: Date.now(),
        author: data.author || ''
      }
    };

    // Migrate components
    migrated.components = (data.components || []).map((comp: any) => ({
      ...comp,
      // Ensure all required fields exist
      id: comp.id || `comp_${Date.now()}_${Math.random()}`,
      type: comp.type || 'unknown',
      x: comp.x || 0,
      y: comp.y || 0,
      rotation: comp.rotation || 0,
      pins: comp.pins || [],
      props: comp.props || {},
      state: comp.state || {}
    }));

    // Migrate wires
    migrated.wires = (data.wires || []).map((wire: any) => ({
      ...wire,
      // Ensure all required fields exist
      id: wire.id || `wire_${Date.now()}_${Math.random()}`,
      from: wire.from || { componentId: '', pinId: '' },
      to: wire.to || { componentId: '', pinId: '' },
      color: wire.color || '#000000'
    }));

    return migrated;
  }

  /**
   * Migrate from 1.0.0 to 1.1.0
   * - Add simulation state
   * - Add time controls
   * - Add seed for deterministic simulation
   */
  private migrateFrom100To110(data: any): any {
    const migrated = {
      ...data,
      version: '1.1.0',
      simulation: {
        running: false,
        time: 0,
        timeScale: 1.0,
        seed: Date.now()
      }
    };

    return migrated;
  }

  /**
   * Create a new circuit schema
   */
  createNewCircuit(name: string = 'New Circuit'): CircuitSchema {
    return {
      version: this.currentVersion,
      components: [],
      wires: [],
      metadata: {
        name,
        description: '',
        created: Date.now(),
        modified: Date.now(),
        author: ''
      }
    };
  }

  /**
   * Validate circuit schema
   */
  validateSchema(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!data.version) {
      errors.push('Missing version field');
    }

    if (!data.components || !Array.isArray(data.components)) {
      errors.push('Missing or invalid components array');
    }

    if (!data.wires || !Array.isArray(data.wires)) {
      errors.push('Missing or invalid wires array');
    }

    if (!data.metadata) {
      errors.push('Missing metadata');
    } else {
      if (!data.metadata.name) {
        errors.push('Missing circuit name in metadata');
      }
      if (!data.metadata.created) {
        errors.push('Missing creation timestamp in metadata');
      }
    }

    // Validate components
    if (data.components) {
      data.components.forEach((comp: any, index: number) => {
        if (!comp.id) {
          errors.push(`Component ${index}: missing id`);
        }
        if (!comp.type) {
          errors.push(`Component ${index}: missing type`);
        }
        if (typeof comp.x !== 'number' || typeof comp.y !== 'number') {
          errors.push(`Component ${index}: invalid position`);
        }
        if (!comp.pins || !Array.isArray(comp.pins)) {
          errors.push(`Component ${index}: missing or invalid pins`);
        }
      });
    }

    // Validate wires
    if (data.wires) {
      data.wires.forEach((wire: any, index: number) => {
        if (!wire.id) {
          errors.push(`Wire ${index}: missing id`);
        }
        if (!wire.from || !wire.from.componentId || !wire.from.pinId) {
          errors.push(`Wire ${index}: invalid from connection`);
        }
        if (!wire.to || !wire.to.componentId || !wire.to.pinId) {
          errors.push(`Wire ${index}: invalid to connection`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get current schema version
   */
  getCurrentVersion(): string {
    return this.currentVersion;
  }

  /**
   * Get supported versions
   */
  getSupportedVersions(): string[] {
    const versions = new Set<string>();
    versions.add('0.9.0'); // Legacy
    versions.add(this.currentVersion);
    
    this.migrations.forEach(migration => {
      versions.add(migration.fromVersion);
      versions.add(migration.toVersion);
    });

    return Array.from(versions).sort();
  }

  /**
   * Check if a version is supported
   */
  isVersionSupported(version: string): boolean {
    return this.getSupportedVersions().includes(version);
  }

  /**
   * Get migration path from one version to another
   */
  getMigrationPath(fromVersion: string, toVersion: string): string[] {
    const path: string[] = [fromVersion];
    let currentVersion = fromVersion;

    while (currentVersion !== toVersion) {
      const migration = this.migrations.find(m => m.fromVersion === currentVersion);
      if (!migration) {
        throw new Error(`No migration path from ${fromVersion} to ${toVersion}`);
      }
      
      currentVersion = migration.toVersion;
      path.push(currentVersion);
    }

    return path;
  }

  /**
   * Export circuit data with current schema
   */
  exportCircuit(data: CircuitSchema): string {
    const exportData = {
      ...data,
      version: this.currentVersion,
      metadata: {
        ...data.metadata,
        modified: Date.now()
      }
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import circuit data and migrate if needed
   */
  importCircuit(jsonData: string): CircuitSchema {
    try {
      const data = JSON.parse(jsonData);
      return this.migrate(data);
    } catch (error) {
      throw new Error(`Failed to import circuit: ${error.message}`);
    }
  }
}

// Global migrator instance
let globalMigrator: SchemaMigrator | null = null;

/**
 * Get global migrator instance
 */
export function getMigrator(): SchemaMigrator {
  if (!globalMigrator) {
    globalMigrator = new SchemaMigrator();
  }
  return globalMigrator;
}

/**
 * Initialize migrator
 */
export function initMigrator(): SchemaMigrator {
  globalMigrator = new SchemaMigrator();
  return globalMigrator;
}

/**
 * Convenience functions
 */
export const migrator = {
  migrate: (data: any) => getMigrator().migrate(data),
  validateSchema: (data: any) => getMigrator().validateSchema(data),
  createNewCircuit: (name?: string) => getMigrator().createNewCircuit(name),
  exportCircuit: (data: CircuitSchema) => getMigrator().exportCircuit(data),
  importCircuit: (jsonData: string) => getMigrator().importCircuit(jsonData),
  getCurrentVersion: () => getMigrator().getCurrentVersion(),
  getSupportedVersions: () => getMigrator().getSupportedVersions(),
  isVersionSupported: (version: string) => getMigrator().isVersionSupported(version)
};
