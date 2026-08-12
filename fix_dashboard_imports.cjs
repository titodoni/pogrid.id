const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'resources/js/Pages/Owner/Dashboard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes("import ActiveDelayDirectory")) {
    content = content.replace("import echo from '../../bootstrap';", 
        "import echo from '../../bootstrap';\nimport ProductionPipeline from '../../Components/OwnerDashboard/ProductionPipeline';\nimport ActiveDelayDirectory from '../../Components/OwnerDashboard/ActiveDelayDirectory';");
}

if (!content.includes("const getFilteredMatrix")) {
    content = content.replace("const [matrixFilter", 
        "const getFilteredMatrix = () => [];\n    const [matrixFilter");
}

fs.writeFileSync(filePath, content);
