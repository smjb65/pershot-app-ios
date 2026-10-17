const fs = require('fs');
const path = require('path');

function findTargetFiles(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of list) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        if (!item.name.startsWith('.') && item.name !== 'android' && item.name !== 'ios' && item.name !== '.gradle') {
          results = results.concat(findTargetFiles(fullPath));
        }
      } else if (item.name === 'findPackageName.js' || item.name === 'findPackageClassName.js') {
        results.push(fullPath);
      }
    }
  } catch (e) {}
  return results;
}

const targets = findTargetFiles(path.join(__dirname, 'node_modules'));
console.log(`????? ${targets.length} ???? ????? ?? ??? ???? ???? ??.`);

targets.forEach(filePath => {
  console.log('?? ??? ?? ????:', filePath);
  const patchCode = `
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = () => "com.pershot.app";
exports.findPackageName = () => "com.pershot.app";
exports.getPackageName = () => "com.pershot.app";
exports.matchClassName = () => "com.pershot.app.MainActivity";
  `.trim();
  fs.writeFileSync(filePath, patchCode, 'utf8');
});

// ?? ???? ?????? ??????? ?? cli-platform-android
function findConfigIndex(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of list) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        if (!item.name.startsWith('.') && item.name !== 'android' && item.name !== 'ios') {
          results = results.concat(findConfigIndex(fullPath));
        }
      } else if (item.name === 'index.js' && fullPath.includes('cli-platform-android')) {
        results.push(fullPath);
      }
    }
  } catch (e) {}
  return results;
}

const configFiles = findConfigIndex(path.join(__dirname, 'node_modules'));
configFiles.forEach(cfgPath => {
  console.log('?? ??? ?? ???? ??????:', cfgPath);
  let content = fs.readFileSync(cfgPath, 'utf8');
  content = content.replace(/packageName:\s*[^,\n]+/, 'packageName: "com.pershot.app"');
  fs.writeFileSync(cfgPath, content, 'utf8');
});

// ?????????? ????? CLI
try {
  const cliBin = path.join(__dirname, 'node_modules', '@react-native-community', 'cli', 'build', 'bin.js');
  const output = require('child_process').execSync(`node "${cliBin}" config`, { encoding: 'utf8' });
  const json = JSON.parse(output);
  console.log('?? ??????? ?????: project.android.packageName =', json.project?.android?.packageName);
} catch (err) {
  console.log('????? ???:', err.message);
}
