// const { readFileSync, writeFileSync } = require("fs");
// const { join } = require("path");

// const nodeModulesPath = join(__dirname, "node_modules");
// const missingDeps = [
//   // 'yocto-queue'
// ];

// const pkg = JSON.parse(readFileSync(join(__dirname, "package.json")));

// let requiredModules = [...missingDeps];

// function loadModules(pkgName, nodes) {
//   if (pkgName.match(/^@types\//)) {
//     return;
//   }
//   if (requiredModules.includes(pkgName)) {
//     return;
//   }
//   if (pkgName === 'yocto-queue') {
//     console.log(nodes);
//   }
//   const pkgPath = join(nodeModulesPath, pkgName, "package.json");
//   const pkg = JSON.parse(readFileSync(pkgPath));
//   if (pkg.dependencies) {
//     Object.keys(pkg.dependencies).forEach(dep => loadModules(dep, [...nodes, pkgName]));
//   }
//   requiredModules.push(pkgName);
// }

// for (const package of Object.keys(pkg.dependencies)) {
//   loadModules(package, []);
// }
// requiredModules = requiredModules.sort((a, b) => a.localeCompare(b));

// const vscodeIgnorePath = '.vscodeignore';
// let vscodeIgnoreContent = readFileSync(vscodeIgnorePath, 'utf8');
// const ignoreItems = vscodeIgnoreContent.split('\n').reduce((acc, item) => {
//   if (item.match(/\!node_modules\//)) {
//     acc.push(item.replace(/\!node_modules\//, ''));
//   }
//   return acc;
// }, []);

// for (const package of requiredModules) {
//   if (ignoreItems.includes(package)) {
//     continue;
//   }
//   vscodeIgnoreContent += `\n!node_modules/${package}`;
// }
// vscodeIgnoreContent = vscodeIgnoreContent.replace(/\n*$/, '\n');
// writeFileSync(vscodeIgnorePath, vscodeIgnoreContent);