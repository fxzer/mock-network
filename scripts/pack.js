const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist_packed');
const ZIP_NAME = path.join(PROJECT_ROOT, 'mock-network-extension.zip');

function copyFile(src, dest) {
    try {
        const dir = path.dirname(dest);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const content = fs.readFileSync(src);
        fs.writeFileSync(dest, content);
        console.log(`✅ Copied: .../${path.basename(path.dirname(src))}/${path.basename(src)}`);
    } catch (e) {
        console.error(`❌ Failed to copy file: ${src}`, e);
    }
}

function recursiveCopy(srcDir, destDir) {
  // Keeping this helper for other directories, but NOT using it for src/ui/dist
  if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
  }
  
  let entries;
  try {
      entries = fs.readdirSync(srcDir, { withFileTypes: true });
  } catch (e) {
      console.error(`⚠️ Cannot list directory: ${srcDir}. Skipping.`);
      return;
  }

  for (const entry of entries) {
      // Exclude Markdown files
      if (entry.name.endsWith('.md')) {
          continue;
      }

      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);

      if (entry.isDirectory()) {
          recursiveCopy(srcPath, destPath);
      } else {
          copyFile(srcPath, destPath);
      }
  }
}

async function main() {
    const args = process.argv.slice(2);
    const shouldBuild = args.includes('-b') || args.includes('--build');

    console.log('🚀 Starting packaging process...');

    if (shouldBuild) {
        console.log('🔨 Building UI...');
        try {
            const uiDir = path.join(PROJECT_ROOT, 'src/ui');
            // Check if node_modules exists
            if (!fs.existsSync(path.join(uiDir, 'node_modules'))) {
                console.warn('⚠️  node_modules not found in src/ui. Build might fail.');
                console.log('   Running pnpm install...');
                try {
                    execSync('pnpm install', { cwd: uiDir, stdio: 'inherit' });
                } catch (e) {
                     console.error('⚠️  pnpm install failed (likely permission issues). Trying to build anyway...');
                }
            }
            
            console.log('   Running pnpm build...');
            try {
                execSync('pnpm build', { cwd: uiDir, stdio: 'inherit' });
                console.log('✅ UI Build complete.');
            } catch (e) {
                console.error('❌ UI Build failed locally (likely permission issues).');
                console.warn('⚠️  Proceeding with EXISTING built files in src/ui/dist...');
                console.warn('   Note: If you made changes to the UI, please run "pnpm build" in src/ui dir manually first.');
            }
        } catch (e) {
             console.error('❌ Unexpected error during build setup:', e);
             // Don't exit, try to pack what we have
        }
    } else {
        console.log('ℹ️  Skipping build. Use -b or --build to build UI before packaging.');
    }

    try {
        // 1. Clean
        console.log('🧹 Cleaning up...');
        if (fs.existsSync(DIST_DIR)) {
            fs.rmSync(DIST_DIR, { recursive: true, force: true });
        }
        if (fs.existsSync(ZIP_NAME)) {
            fs.unlinkSync(ZIP_NAME);
        }
        fs.mkdirSync(DIST_DIR);

        // 2. Copy base files
        console.log('📂 Copying base files...');
        fs.copyFileSync(path.join(PROJECT_ROOT, 'manifest.json'), path.join(DIST_DIR, 'manifest.json'));
        recursiveCopy(path.join(PROJECT_ROOT, 'assets/icons'), path.join(DIST_DIR, 'assets/icons'));
        recursiveCopy(path.join(PROJECT_ROOT, 'src/background'), path.join(DIST_DIR, 'src/background'));
        recursiveCopy(path.join(PROJECT_ROOT, 'src/content'), path.join(DIST_DIR, 'src/content'));
        recursiveCopy(path.join(PROJECT_ROOT, 'src/inject'), path.join(DIST_DIR, 'src/inject'));
        recursiveCopy(path.join(PROJECT_ROOT, 'src/devtools'), path.join(DIST_DIR, 'src/devtools'));

        // 3. Process Manifest and Source Files (Rename dist -> build)
        console.log('📝 Processing Manifest and Source Files...');
        
        // Helper to replace content in file
        const replaceInFile = (filePath) => {
            if (fs.existsSync(filePath)) {
                let content = fs.readFileSync(filePath, 'utf8');
                if (content.includes('src/ui/dist')) {
                    console.log(`   Fixing paths in: ${path.basename(filePath)}`);
                    content = content.replace(/src\/ui\/dist/g, 'src/ui');
                    fs.writeFileSync(filePath, content);
                }
            }
        };

        // Fix manifest
        replaceInFile(path.join(DIST_DIR, 'manifest.json'));
        
        // Fix other files that reference src/ui/dist
        // Based on grep results: src/content/index.js, src/devtools/index.js
        replaceInFile(path.join(DIST_DIR, 'src/content/index.js'));
        replaceInFile(path.join(DIST_DIR, 'src/devtools/index.js'));
        
        // Also check background just in case
        replaceInFile(path.join(DIST_DIR, 'src/background/index.js'));


        // 4. Copy UI files (Using Shell Command to bypass permissions & handle dynamic files)
        console.log('📂 Copying UI files...');
        const uiSrcRoot = path.join(PROJECT_ROOT, 'src/ui/dist');
        const uiDestRoot = path.join(DIST_DIR, 'src/ui');

        console.log(`   Ordering system to copy: ${uiSrcRoot} -> ${uiDestRoot}`);
        
        // Ensure destination exists
        if (!fs.existsSync(uiDestRoot)) {
            fs.mkdirSync(uiDestRoot, { recursive: true });
        }

        try {
            // Try copying content with wildcard to avoid directory permission issues
            // Note: in shell, dist/* matches files inside.
            execSync(`cp -r "${uiSrcRoot}/." "${uiDestRoot}"`, { stdio: 'inherit' });
            console.log('✅ UI files copied successfully via shell.');
        } catch (e) {
             console.error('❌ Failed to copy UI files via shell:', e);
             console.error('   Please ensure src/ui/dist exists and is readable.');
             process.exit(1);
        }

        // 5. Output Uncompressed Folder
        console.log('📂 Preparing output folder...');
        const outputDir = path.join(PROJECT_ROOT, 'mock-network-extension');
        
        // Remove existing output dir if it exists
        if (fs.existsSync(outputDir)) {
            fs.rmSync(outputDir, { recursive: true, force: true });
        }
        
        // Move dist_packed to mock-network-extension
        fs.renameSync(DIST_DIR, outputDir);
        
        console.log(`✅ Unpacked extension ready at ./mock-network-extension`);

        // 6. Zip (Optional, for sharing)
        console.log('📦 Creating Zip for sharing...');
        if (fs.existsSync(ZIP_NAME)) {
            fs.unlinkSync(ZIP_NAME);
        }
        
        // Zip the output directory
        execSync(`cd "${outputDir}" && zip -r "${ZIP_NAME}" .`);
        console.log(`✅ Zip package ready at ./mock-network-extension.zip`);

    } catch (error) {
        console.error('❌ Packaging failed:', error);
        process.exit(1);
    }
}

main();
