const extract = require("extract-zip");

const [zipPath, destDir] = process.argv.slice(2);
if (!zipPath || !destDir) {
  console.error("Usage: node extract-electron-zip.cjs <zipPath> <destDir>");
  process.exit(1);
}

extract(zipPath, { dir: destDir })
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
