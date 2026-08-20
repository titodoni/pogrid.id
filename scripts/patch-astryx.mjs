import fs from 'node:fs';
import path from 'node:path';

const targetDir = 'node_modules/@astryxdesign/core/dist';
const resolvedBaseDir = path.resolve(process.cwd(), targetDir);

function walk(dir) {
    let results = [];
    const resolvedDir = path.resolve(dir);
    if (!fs.existsSync(resolvedDir) || !resolvedDir.startsWith(resolvedBaseDir)) return results;
    const list = fs.readdirSync(resolvedDir);
    list.forEach(file => {
        const fullPath = path.resolve(resolvedDir, file);
        if (!fullPath.startsWith(resolvedBaseDir + path.sep) && fullPath !== resolvedBaseDir) {
            return;
        }
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(fullPath));
        } else if (stat && stat.isFile() && file.endsWith('.js')) {
            results.push(fullPath);
        }
    });
    return results;
}

if (fs.existsSync(resolvedBaseDir)) {
    const files = walk(resolvedBaseDir);
    let count = 0;
    files.forEach(f => {
        const resolvedFilePath = path.resolve(f);
        if (!resolvedFilePath.startsWith(resolvedBaseDir + path.sep)) {
            return;
        }
        let content = fs.readFileSync(resolvedFilePath, 'utf8');
        let changed = false;

        if (content.includes("from 'react'") && (content.includes('use') || content.includes('useOptimistic'))) {
            const hasOptimisticInCode = content.includes('useOptimistic(');

            content = content.replace(/import\s+(?:(React|\*\s+as\s+React)\s*,\s*)?\{([^}]+)\}\s+from\s+['"]react['"];?/g, (match, def, spec) => {
                const items = spec.split(',').map(s => s.trim()).filter(Boolean);
                const hasUse = items.includes('use');
                const hasUseOptimistic = items.includes('useOptimistic');

                if (!hasUse && !hasUseOptimistic) return match;

                const newItems = items.filter(item => item !== 'useOptimistic').map(item => {
                    if (item === 'use') return 'useContext as use';
                    return item;
                });

                const prefix = def ? `${def}, ` : '';
                if (newItems.length === 0) {
                    return def ? `import ${def} from 'react';` : '';
                }
                return `import ${prefix}{ ${newItems.join(', ')} } from 'react';`;
            });

            if (hasOptimisticInCode && !content.includes('function useOptimistic(')) {
                const fallback = `
import { useState as _astryx_useState, useEffect as _astryx_useEffect, useCallback as _astryx_useCallback } from 'react';
function useOptimistic(passthrough, updateFn) {
  var _s = _astryx_useState({ hasOverride: false, value: undefined });
  var override = _s[0], setOverride = _s[1];
  _astryx_useEffect(function() {
    if (override.hasOverride) {
      setOverride({ hasOverride: false, value: undefined });
    }
  }, [passthrough]);
  var state = override.hasOverride ? (updateFn ? updateFn(passthrough, override.value) : override.value) : passthrough;
  var setOptimistic = _astryx_useCallback(function(action) {
    setOverride({ hasOverride: true, value: action });
  }, []);
  return [state, setOptimistic];
}
`;
                content = fallback + '\n' + content;
            }

            changed = true;
        }

        // 2. React 19 Context-as-Provider support for React 18:
        // In React 19, `<Context value="...">` is valid.
        // In React 18, it must be `<Context.Provider value="...">`.
        if (content.includes('Context,')) {
            const patched = content.replace(/(_jsx|_jsxs)\(([A-Za-z0-9_]*Context),/g, '$1($2.Provider || $2,');
            if (patched !== content) {
                content = patched;
                changed = true;
            }
        }

        if (changed) {
            fs.writeFileSync(f, content, 'utf8');
            count++;
        }
    });
    console.log(`Patched ${count} files in @astryxdesign/core for React 18.`);
}
