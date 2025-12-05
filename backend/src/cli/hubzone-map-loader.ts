#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * HUBZone Map Loader CLI
 *
 * Command-line interface for manually running HUBZone map data updates.
 *
 * Usage:
 *   npx tsx src/cli/hubzone-map-loader.ts [options]
 *
 * Options:
 *   --dry-run        Run without making database changes
 *   --no-notify      Skip business notifications
 *   --state <fips>   Only process specific state(s) (comma-separated FIPS codes)
 *   --cache-dir <path>  Custom cache directory
 *   --verbose        Enable verbose logging
 *   --help           Show help
 *
 * Examples:
 *   npx tsx src/cli/hubzone-map-loader.ts
 *   npx tsx src/cli/hubzone-map-loader.ts --dry-run
 *   npx tsx src/cli/hubzone-map-loader.ts --state 06,36 --verbose
 */

import { HUBZoneMapLoaderService } from '../services/hubzoneMapLoader.js';
import type { HUBZoneMapLoaderConfig, DownloadProgress } from '../types/hubzoneMapLoader.js';

interface CLIOptions {
  dryRun: boolean;
  noNotify: boolean;
  states: string[];
  cacheDir: string | null;
  verbose: boolean;
  help: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    dryRun: false,
    noNotify: false,
    states: [],
    cacheDir: null,
    verbose: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--no-notify':
        options.noNotify = true;
        break;
      case '--state': {
        const stateArg = args[++i];
        if (stateArg) {
          options.states = stateArg.split(',').map((s) => s.trim());
        }
        break;
      }
      case '--cache-dir':
        options.cacheDir = args[++i] ?? null;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
HUBZone Map Loader CLI
======================

Downloads and imports the latest HUBZone map data from Census and SBA sources.

USAGE:
  npx tsx src/cli/hubzone-map-loader.ts [options]

OPTIONS:
  --dry-run         Run without making database changes
  --no-notify       Skip business notifications
  --state <fips>    Only process specific state(s) (comma-separated FIPS codes)
                    Example: --state 06,36 for California and New York
  --cache-dir <path> Custom cache directory
  --verbose         Enable verbose logging
  --help, -h        Show this help message

EXAMPLES:
  # Full import with notifications
  npx tsx src/cli/hubzone-map-loader.ts

  # Dry run to see what would be imported
  npx tsx src/cli/hubzone-map-loader.ts --dry-run

  # Import specific states with verbose output
  npx tsx src/cli/hubzone-map-loader.ts --state 06,36 --verbose

  # Import without sending notifications
  npx tsx src/cli/hubzone-map-loader.ts --no-notify

STATE FIPS CODES:
  01 Alabama        02 Alaska         04 Arizona        05 Arkansas
  06 California     08 Colorado       09 Connecticut    10 Delaware
  11 DC             12 Florida        13 Georgia        15 Hawaii
  16 Idaho          17 Illinois       18 Indiana        19 Iowa
  20 Kansas         21 Kentucky       22 Louisiana      23 Maine
  24 Maryland       25 Massachusetts  26 Michigan       27 Minnesota
  28 Mississippi    29 Missouri       30 Montana        31 Nebraska
  32 Nevada         33 New Hampshire  34 New Jersey     35 New Mexico
  36 New York       37 North Carolina 38 North Dakota   39 Ohio
  40 Oklahoma       41 Oregon         42 Pennsylvania   44 Rhode Island
  45 South Carolina 46 South Dakota   47 Tennessee      48 Texas
  49 Utah           50 Vermont        51 Virginia       53 Washington
  54 West Virginia  55 Wisconsin      56 Wyoming
  60 American Samoa 66 Guam           69 N. Mariana Is. 72 Puerto Rico
  78 Virgin Islands
`);
}

/**
 * Format progress bar
 */
function formatProgressBar(percent: number, width = 30): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${percent}%`;
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Progress callback for verbose mode
 */
function createProgressCallback(verbose: boolean): (progress: DownloadProgress) => void {
  let lastState = '';

  return (progress: DownloadProgress) => {
    if (!verbose) return;

    const progressBar = formatProgressBar(progress.percentComplete);

    if (progress.currentState && progress.currentState !== lastState) {
      lastState = progress.currentState;
      console.log(`\n[${progress.stage.toUpperCase()}] Processing ${progress.currentState}...`);
    }

    process.stdout.write(
      `\r${progressBar} | ${progress.statesCompleted}/${progress.totalStates} states` +
      (progress.bytesDownloaded > 0
        ? ` | ${formatBytes(progress.bytesDownloaded)}`
        : '')
    );
  };
}

/**
 * Format duration in milliseconds to human readable
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           HUBZone Map Data Loader                            ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  Loading latest HUBZone designations from Census and SBA     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  // Build configuration
  const config: Partial<HUBZoneMapLoaderConfig> = {
    dryRun: options.dryRun,
    enableNotifications: !options.noNotify,
  };

  if (options.cacheDir) {
    config.cacheDirectory = options.cacheDir;
  }

  // Display configuration
  console.log('Configuration:');
  console.log(`  Mode:          ${options.dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log(`  Notifications: ${options.noNotify ? 'DISABLED' : 'ENABLED'}`);
  console.log(`  Verbose:       ${options.verbose ? 'YES' : 'NO'}`);
  if (options.states.length > 0) {
    console.log(`  States:        ${options.states.join(', ')}`);
  }
  console.log('');

  if (options.dryRun) {
    console.log('⚠️  DRY RUN MODE - No database changes will be made');
    console.log('');
  }

  // Create service instance
  const loader = new HUBZoneMapLoaderService(config);

  // Set up progress callback if verbose
  if (options.verbose) {
    loader.setProgressCallback(createProgressCallback(true));
  }

  console.log('Starting import...');
  console.log('');

  const startTime = Date.now();

  try {
    // Run the import
    const result = await loader.loadLatestHUBZoneMap();

    console.log('');
    console.log('');

    if (result.success) {
      console.log('╔══════════════════════════════════════════════════════════════╗');
      console.log('║                    IMPORT COMPLETED                          ║');
      console.log('╚══════════════════════════════════════════════════════════════╝');
      console.log('');
      console.log('Statistics:');
      console.log(`  Import ID:           ${result.importId}`);
      console.log(`  Total Tracts:        ${result.statistics.totalTracts.toLocaleString()}`);
      console.log(`  New Designations:    ${result.statistics.newDesignations.toLocaleString()}`);
      console.log(`  Updated:             ${result.statistics.updatedDesignations.toLocaleString()}`);
      console.log(`  Expired:             ${result.statistics.expiredDesignations.toLocaleString()}`);
      console.log(`  Redesignated Areas:  ${result.statistics.redesignatedAreas.toLocaleString()}`);
      console.log(`  Active HUBZones:     ${result.statistics.activeHubzones.toLocaleString()}`);
      console.log(`  Businesses Notified: ${result.affectedBusinessCount.toLocaleString()}`);
      console.log(`  Processing Time:     ${formatDuration(result.statistics.processingTimeMs)}`);

      if (result.warnings.length > 0) {
        console.log('');
        console.log('Warnings:');
        for (const warning of result.warnings.slice(0, 10)) {
          console.log(`  ⚠️  ${warning.code}: ${warning.message}`);
        }
        if (result.warnings.length > 10) {
          console.log(`  ... and ${result.warnings.length - 10} more warnings`);
        }
      }

      console.log('');
      console.log('✅ Import completed successfully!');
    } else {
      console.log('╔══════════════════════════════════════════════════════════════╗');
      console.log('║                    IMPORT FAILED                             ║');
      console.log('╚══════════════════════════════════════════════════════════════╝');
      console.log('');
      console.log('Errors:');
      for (const error of result.errors) {
        console.log(`  ❌ ${error.code}: ${error.message}`);
      }
      console.log('');
      console.log('❌ Import failed. Check logs for details.');
      process.exit(1);
    }
  } catch (error) {
    console.error('');
    console.error('╔══════════════════════════════════════════════════════════════╗');
    console.error('║                   UNEXPECTED ERROR                           ║');
    console.error('╚══════════════════════════════════════════════════════════════╝');
    console.error('');
    console.error(error instanceof Error ? error.message : 'Unknown error');

    if (options.verbose && error instanceof Error) {
      console.error('');
      console.error('Stack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }

  const totalTime = Date.now() - startTime;
  console.log('');
  console.log(`Total execution time: ${formatDuration(totalTime)}`);
}

// Run the CLI
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

