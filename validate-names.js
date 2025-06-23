const fs = require('fs');
const path = require('path');
const leven = require('leven').default;
const XLSX = require('xlsx');

// Load name list from [ [id, name], ... ] JSON format
function loadCorrectNames(jsonPath) {
    let raw = fs.readFileSync(jsonPath, 'utf8');
    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1); // Remove BOM
    const data = JSON.parse(raw);

    if (!Array.isArray(data) || !Array.isArray(data[0]) || data[0].length < 2) {
        throw new Error("Expected format: [ [id, name], ... ]");
    }

    return data.map(([id, name]) => name.trim());
}

// Extract name from filename (before the first underscore)
function extractName(filename) {
    return filename.split('_')[0].trim();
}

// Find closest match for a name from the correct list
function findBestMatch(name, correctNames) {
    let bestMatch = null;
    let bestDistance = Infinity;

    for (const correct of correctNames) {
        const distance = leven(name.toLowerCase(), correct.toLowerCase());
        if (distance < bestDistance) {
            bestDistance = distance;
            bestMatch = correct;
        }
    }

    return { match: bestMatch, distance: bestDistance };
}

// Validate and optionally rename files
function validateAndRenameFiles(folderPath, correctNames, doRename = false) {
    const files = fs.readdirSync(folderPath);
    const results = [];

    files.forEach(file => {
        const ext = path.extname(file);
        const originalName = extractName(file);
        const rest = file.slice(originalName.length); // includes the underscore and the rest

        const { match: correctName, distance } = findBestMatch(originalName, correctNames);
        const isCorrect = originalName.toLowerCase() === correctName.toLowerCase();
        const newFile = `${correctName}${rest}`;
        const oldPath = path.join(folderPath, file);
        const newPath = path.join(folderPath, newFile);
        const needsRename = !isCorrect && file !== newFile;

        if (needsRename && doRename) {
            try {
                fs.renameSync(oldPath, newPath);
                console.log(`🔁 Renamed: ${file} → ${newFile}`);
            } catch (err) {
                console.error(`❌ Rename failed: ${file} → ${newFile}: ${err.message}`);
            }
        }

        results.push({
            original: file,
            extractedName: originalName,
            matchedName: correctName,
            correctedFilename: newFile,
            distance,
            status: isCorrect ? '✅ Correct' : (needsRename ? '🟡 Renamed' : '❌ Not Matched')
        });
    });

    return results;
}

// Main
(function main() {
    const [,, jsonPath, folderPath, flag] = process.argv;

    if (!jsonPath || !folderPath) {
        console.error("Usage: node validate-names.js <names.json> <folderPath> [--rename]");
        process.exit(1);
    }

    const doRename = flag === '--rename';

    try {
        const correctNames = loadCorrectNames(jsonPath);
        const results = validateAndRenameFiles(folderPath, correctNames, doRename);

        console.log("\n📋 VALIDATION SUMMARY:");
        results.forEach(r => {
            console.log(`${r.status} → ${r.original} | Match: ${r.matchedName} | Distance: ${r.distance}`);
        });

        // Save to JSON
        fs.writeFileSync('./name-validation-results.json', JSON.stringify(results, null, 2));
        console.log("✅ Report saved to name-validation-results.json");

        // Save to Excel
        const excelData = results.map(r => ({
            "Original Filename": r.original,
            "Extracted Name": r.extractedName,
            "Matched Name": r.matchedName,
            "Corrected Filename": r.correctedFilename,
            "Match Distance": r.distance,
            "Status": r.status
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Results");

        XLSX.writeFile(workbook, './name-validation-results.xlsx');
        console.log("📄 Excel file saved to name-validation-results.xlsx");

    } catch (err) {
        console.error("❌ ERROR:", err.message);
        process.exit(1);
    }
})();