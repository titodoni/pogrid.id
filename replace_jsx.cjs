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

let lines = content.split('\n');
const startLine = 3552; // 0-indexed for 3553
const endLine = 4134; // 0-indexed for 4135, which is before Team / User Management Tab

if (lines[startLine].includes("Section 5: Finance Health Strip") && lines[endLine + 1].includes("Team / User Management Tab")) {
    lines.splice(startLine, endLine - startLine + 1, replacement, '                    </div>', '                );', '            })()}', '', '', '            </div>', '');
    fs.writeFileSync(file, lines.join('\n'));
    console.log("Replaced lines successfully.");
} else {
    console.log("Lines didn't match.");
    console.log(lines[startLine]);
    console.log(lines[endLine + 1]);
}
