const fs = require('fs');
const content = fs.readFileSync('resources/js/Pages/Owner/Dashboard.tsx', 'utf-8');
const lines = content.split('\n');

const pipelineStart = lines.findIndex(l => l.includes('{/* ── Production Pipeline ──────────────────────────── */}'));
const pipelineEnd = lines.findIndex((l, i) => i > pipelineStart && l.includes('{/* ── Active Delay & Risk Directory ────────────────────── */}'));

const pipelineCode = lines.slice(pipelineStart, pipelineEnd).join('\n');
fs.writeFileSync('pipeline_section.txt', pipelineCode);

const delayStart = pipelineEnd;
const delayEnd = lines.findIndex((l, i) => i > delayStart && l.includes('{/* ── Section 5: Finance Health Strip ──────────────────── */}'));

const delayCode = lines.slice(delayStart, delayEnd).join('\n');
fs.writeFileSync('delay_section.txt', delayCode);
