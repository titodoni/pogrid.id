const fs = require('fs');
const file = '/home/tito/pogrid/resources/js/Pages/Owner/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacement = `                        {/* ── Section 5: Finance Health Strip ──────────────────── */}
                        <FinanceHealthStrip
                            telemetry={telemetry}
                            language={language}
                            matrixFilter={matrixFilter}
                            setMatrixFilter={setMatrixFilter}
                        />

                        {/* ── Chart Row ─────────────────────────────────────────── */}
                        <ChartRow
                            t={t}
                            language={language}
                            telemetry={telemetry}
                            matrixFilter={matrixFilter}
                            setMatrixFilter={setMatrixFilter}
                        />

                        {/* ── Bottleneck Detail Table ───────────────────────────── */}
                        <BottleneckDetailTable
                            t={t}
                            language={language}
                            telemetry={telemetry}
                            matrixFilter={matrixFilter}
                            setMatrixFilter={setMatrixFilter}
                        />

                        {/* ── Section 4: Papan Kinerja Klien ───────────────────── */}
                        <ClientPerformanceBoard
                            language={language}
                            telemetry={telemetry}
                            matrixFilter={matrixFilter}
                            setMatrixFilter={setMatrixFilter}
                        />`;

const startStr = '{/* ── Section 5: Finance Health Strip ──────────────────── */}';
const endStr = `                        {/* ── Team / User Management Tab ─────────────────────────────── */}`;

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
    // find the previous line start
    let realStart = content.lastIndexOf('\n', startIndex);
    
    // The target block ends a few lines before Team / User Management Tab.
    // Specifically, before `</div>\n\n            {/* ── Team / User Management Tab ─────────────────────────────── */}`
    // So let's look for `</div>\n\n            {/* ── Team / User Management Tab`
    const endMatchStr = `</div>\n\n            {/* ── Team / User Management Tab`;
    const realEndIndex = content.lastIndexOf(endMatchStr, endIndex + 20);
    
    if (realEndIndex !== -1) {
        content = content.substring(0, realStart) + '\n' + replacement + '\n\n                    ' + content.substring(realEndIndex);
        fs.writeFileSync(file, content);
        console.log("Replaced successfully!");
    } else {
        console.log("Could not find real end index");
    }
} else {
    console.log("Could not find start or end bounds.");
}
