import fs from 'fs';
import path from 'path';

const TAG = 'Owen Yeo Le Yang A0252047L';

function addCommentsToTestLines(content) {
  const lines = content.split('\n');
  const out = [];
  for (const line of lines) {
    const m = line.match(/^(\s*)(test|it)\s*\(/);
    if (m) {
      const indent = m[1] || '';
      const prev = out.length ? out[out.length - 1].trim() : '';
      if (prev !== `// ${TAG}`) out.push(`${indent}// ${TAG}`);
    }
    out.push(line);
  }
  return out.join('\n');
}

function findDescribeBlock(content, describeName) {
  const markers = [`describe("${describeName}"`, `describe('${describeName}'`];
  let start = -1;
  for (const marker of markers) {
    start = content.indexOf(marker);
    if (start !== -1) break;
  }
  if (start === -1) return null;

  const braceStart = content.indexOf('{', start);
  if (braceStart === -1) return null;

  let depth = 0;
  let end = -1;
  for (let i = braceStart; i < content.length; i += 1) {
    const ch = content[i];
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return null;

  return { start, end };
}

function tagDescribeTests(filePath, describeNames) {
  let content = fs.readFileSync(filePath, 'utf8');
  const blocks = describeNames
    .map((name) => ({ name, block: findDescribeBlock(content, name) }))
    .filter((x) => x.block)
    .sort((a, b) => b.block.start - a.block.start);

  for (const { block } of blocks) {
    const original = content.slice(block.start, block.end + 1);
    const tagged = addCommentsToTestLines(original);
    content = content.slice(0, block.start) + tagged + content.slice(block.end + 1);
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

function tagWholeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  fs.writeFileSync(filePath, addCommentsToTestLines(content), 'utf8');
}

const root = process.cwd();

tagDescribeTests(path.join(root, 'controllers/productController.test.js'), [
  'searchProductController',
  'realtedProductController',
]);

tagDescribeTests(path.join(root, 'controllers/authController.test.js'), [
  'updateProfileController',
  'getOrdersController',
  'getAllOrdersController',
  'orderStatusController',
]);

[
  'client/src/pages/CartPage.test.js',
  'client/src/context/search.test.js',
  'client/src/components/Form/SearchInput.test.js',
  'client/src/pages/Search.test.js',
  'client/src/context/cart.test.js',
].forEach((p) => tagWholeFile(path.join(root, p)));

console.log('done');
