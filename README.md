How to Use It:

Dry Run (no rename, just report):
node validate-names.js employees1.json "employee-photos"


Rename files if name mismatch:
node validate-names.js employees1.json "employee-photos" --rename




✅ Features Included:
Works with your format: [[ "CGC-XXXXX", "NAME" ]]

Compares file name (before _) with true name

Fuzzy match using Levenshtein distance

Renames files if --rename flag is used

Outputs:

✅ name-validation-results.json

✅ name-validation-results.xlsx (for Excel)
