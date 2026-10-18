import fs from 'fs';

let content = fs.readFileSync('src/data/seedData.ts', 'utf8');

if (!content.includes("import { ALL_HOSPITALS } from './hospitalsData';")) {
  content = "import { ALL_HOSPITALS } from './hospitalsData';\n" + content;
}

const startIdx = content.indexOf('export const INITIAL_HOSPITALS: Hospital[] = [');
const endMarker = 'export const INITIAL_MEDICINES:';
const endIdx = content.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = 'export const INITIAL_HOSPITALS: Hospital[] = ALL_HOSPITALS;\n\n';
  content = content.slice(0, startIdx) + replacement + content.slice(endIdx);
  fs.writeFileSync('src/data/seedData.ts', content, 'utf8');
  console.log('Successfully updated seedData.ts with ALL_HOSPITALS!');
} else {
  console.error('Could not find markers: startIdx=', startIdx, 'endIdx=', endIdx);
  process.exit(1);
}
