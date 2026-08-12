const fs = require('fs');

const dashboardPath = 'resources/js/Pages/Owner/Dashboard.tsx';
let content = fs.readFileSync(dashboardPath, 'utf-8');

const pipelineStartMarker = '{/* ── Production Pipeline ──────────────────────────── */}';
const delayStartMarker = '{/* ── Active Delay & Risk Directory ────────────────────── */}';
const financeStartMarker = '{/* ── Section 5: Finance Health Strip ──────────────────── */}';

const pipelineStartIndex = content.indexOf(pipelineStartMarker);
const delayStartIndex = content.indexOf(delayStartMarker);
const financeStartIndex = content.indexOf(financeStartMarker);

if (pipelineStartIndex === -1 || delayStartIndex === -1 || financeStartIndex === -1) {
    console.error('Markers not found');
    process.exit(1);
}

const pipelineCode = content.substring(pipelineStartIndex, delayStartIndex);
const delayCode = content.substring(delayStartIndex, financeStartIndex);

const pipelineComponent = `import React from 'react';

export default function ProductionPipeline({
    language,
    pipelineStages,
    getStageHealth,
    getHealthKey,
    matrixFilter,
    setMatrixFilter
}: any) {
    const healthDotColor: Record<string, string> = {
        stuck: '#ef4444',
        slow: 'var(--color-pg-orange)',
        watch: 'var(--color-pg-warning)',
        normal: 'var(--color-pg-success)',
    };

    return (
        <>
            ${pipelineCode}
        </>
    );
}
`;

const delayComponent = `import React from 'react';

export default function ActiveDelayDirectory({
    matrixFilter,
    setMatrixFilter,
    language,
    t,
    getFilteredMatrix,
    changeTab,
    togglePO,
    getStatusBadge
}: any) {
    return (
        <>
            ${delayCode}
        </>
    );
}
`;

// Create dirs
if (!fs.existsSync('resources/js/Components/OwnerDashboard')) {
    fs.mkdirSync('resources/js/Components/OwnerDashboard', { recursive: true });
}

fs.writeFileSync('resources/js/Components/OwnerDashboard/ProductionPipeline.tsx', pipelineComponent);
fs.writeFileSync('resources/js/Components/OwnerDashboard/ActiveDelayDirectory.tsx', delayComponent);

// Remove healthDotColor definition from Dashboard.tsx
const healthDotColorRegex = /const healthDotColor: Record<string, string> = \{\s*stuck: '#ef4444',\s*slow: 'var\(--color-pg-orange\)',\s*watch: 'var\(--color-pg-warning\)',\s*normal: 'var\(--color-pg-success\)',\s*\};\n/g;
content = content.replace(healthDotColorRegex, '');

// Add imports
const importStatements = `import ProductionPipeline from '@/Components/OwnerDashboard/ProductionPipeline';\nimport ActiveDelayDirectory from '@/Components/OwnerDashboard/ActiveDelayDirectory';\n`;
content = content.replace("import OwnerLayout from '@/Layouts/OwnerLayout';", "import OwnerLayout from '@/Layouts/OwnerLayout';\n" + importStatements);

// Replace JSX blocks
const beforePipeline = content.substring(0, content.indexOf(pipelineStartMarker));
const afterDelay = content.substring(content.indexOf(financeStartMarker));

const replacedContent = beforePipeline + `
                        <ProductionPipeline
                            language={language}
                            pipelineStages={pipelineStages}
                            getStageHealth={getStageHealth}
                            getHealthKey={getHealthKey}
                            matrixFilter={matrixFilter}
                            setMatrixFilter={setMatrixFilter}
                        />

                        <ActiveDelayDirectory
                            matrixFilter={matrixFilter}
                            setMatrixFilter={setMatrixFilter}
                            language={language}
                            t={t}
                            getFilteredMatrix={getFilteredMatrix}
                            changeTab={changeTab}
                            togglePO={togglePO}
                            getStatusBadge={getStatusBadge}
                        />

                        ` + afterDelay;

fs.writeFileSync(dashboardPath, replacedContent);

console.log('Refactoring done.');
