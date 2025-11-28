/**
 * Export OpenAPI Specification
 * 
 * Generates the OpenAPI JSON specification from Swagger configuration.
 * Usage: npx tsx src/scripts/export-openapi.ts [output-path]
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function exportOpenApi(): Promise<void> {
  try {
    // Dynamic import to ensure swagger config loads correctly
    const { getOpenApiJson } = await import('../config/swagger.js');
    
    const outputPath = process.argv[2] || resolve(__dirname, '../../../docs/openapi.json');
    
    console.log('📋 Generating OpenAPI specification...');
    
    const openApiJson = getOpenApiJson();
    
    writeFileSync(outputPath, openApiJson, 'utf-8');
    
    console.log(`✅ OpenAPI specification exported to: ${outputPath}`);
    
    // Parse to get summary
    const spec = JSON.parse(openApiJson);
    const paths = Object.keys(spec.paths || {});
    const schemas = Object.keys(spec.components?.schemas || {});
    
    console.log('');
    console.log('📊 Summary:');
    console.log(`   Endpoints: ${paths.length}`);
    console.log(`   Schemas: ${schemas.length}`);
    console.log(`   Version: ${spec.info?.version || 'unknown'}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Error exporting OpenAPI specification:', error);
    process.exit(1);
  }
}

exportOpenApi();

