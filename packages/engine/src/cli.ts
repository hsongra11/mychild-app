#!/usr/bin/env node

/**
 * CLI for mychild-engine validation.
 *
 * Usage:
 *   npx mychild-engine validate --profiles data/synthetic-profiles.json --output results.json
 *   npx mychild-engine validate --profiles data/synthetic-profiles.json --format markdown --output results.md
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ValidationProfile } from './validation.js';
import { runValidation } from './validation.js';
import { formatReport } from './statistics.js';

function printUsage(): void {
  console.log(`
mychild-engine CLI

Commands:
  validate    Run internal consistency validation against synthetic profiles

Options:
  --profiles <path>   Path to synthetic profiles JSON file (required)
  --output <path>     Output file path (optional, prints to stdout if omitted)
  --format <type>     Output format: "json" (default) or "markdown"
  --help              Show this help message

Examples:
  npx mychild-engine validate --profiles data/synthetic-profiles.json
  npx mychild-engine validate --profiles data/synthetic-profiles.json --format markdown --output results.md
`);
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  const command = args[0];

  if (command !== 'validate') {
    console.error(`Unknown command: ${command}`);
    printUsage();
    process.exit(1);
  }

  // Parse arguments
  let profilesPath: string | undefined;
  let outputPath: string | undefined;
  let format: 'json' | 'markdown' = 'json';

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--profiles':
        profilesPath = args[++i];
        break;
      case '--output':
        outputPath = args[++i];
        break;
      case '--format':
        {
          const fmt = args[++i];
          if (fmt !== 'json' && fmt !== 'markdown') {
            console.error(`Invalid format: ${fmt}. Use "json" or "markdown".`);
            process.exit(1);
          }
          format = fmt;
        }
        break;
      default:
        console.error(`Unknown option: ${args[i]}`);
        printUsage();
        process.exit(1);
    }
  }

  if (!profilesPath) {
    console.error('Error: --profiles is required');
    printUsage();
    process.exit(1);
  }

  // Load profiles
  const resolvedPath = resolve(profilesPath);
  let profilesData: string;
  try {
    profilesData = readFileSync(resolvedPath, 'utf-8');
  } catch {
    console.error(`Error: Cannot read file: ${resolvedPath}`);
    process.exit(1);
  }

  let profiles: ValidationProfile[];
  try {
    profiles = JSON.parse(profilesData) as ValidationProfile[];
  } catch {
    console.error(`Error: Invalid JSON in ${resolvedPath}`);
    process.exit(1);
  }

  if (!Array.isArray(profiles) || profiles.length === 0) {
    console.error('Error: Profiles file must contain a non-empty array');
    process.exit(1);
  }

  // Run validation
  console.error(`Running validation on ${profiles.length} profiles...`);
  const { profileResults, report } = runValidation(profiles);

  // Count correct/incorrect
  let correct = 0;
  let total = 0;
  for (const pr of profileResults) {
    for (const dr of pr.domainResults) {
      total++;
      if (dr.correct) correct++;
    }
  }
  console.error(`Results: ${correct}/${total} domain classifications correct (${((correct / total) * 100).toFixed(1)}%)`);

  // Format output
  let output: string;
  if (format === 'markdown') {
    output = formatReport(report);
  } else {
    output = JSON.stringify({ profileResults, report }, null, 2);
  }

  // Write output
  if (outputPath) {
    const resolvedOutput = resolve(outputPath);
    writeFileSync(resolvedOutput, output, 'utf-8');
    console.error(`Report written to: ${resolvedOutput}`);
  } else {
    console.log(output);
  }
}

main();
