const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000/api/parse-pdf';

async function run() {
    console.log("Starting Test Runner...");
    console.log(`Target API: ${API_URL}`);

    const files = fs.readdirSync(__dirname);
    const validExts = ['.pdf', '.xlsx', '.xls', '.txt'];

    for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (!validExts.includes(ext)) continue;

        console.log(`\n----------------------------------------`);
        console.log(`Processing: ${file}`);

        try {
            const filePath = path.join(__dirname, file);
            const fileContent = fs.readFileSync(filePath);

            // Use built-in fetch and FormData (Node 18+)
            const formData = new FormData();
            const blob = new Blob([fileContent]);
            formData.append('file', blob, file);

            const response = await fetch(API_URL, {
                method: 'POST',
                body: formData
            });

            const text = await response.text();
            let result;
            try {
                result = JSON.parse(text);
            } catch {
                console.log(`❌ FAILED (Invalid JSON): ${text.substring(0, 100)}`);
                continue;
            }

            if (result.success) {
                const count = result.transactions ? result.transactions.length : 0;
                if (count > 0) {
                    console.log(`✅ SUCCESS: ${count} transactions found.`);
                } else {
                    console.log(`⚠️ SUCCESS (0 Txns): Parser ran but found nothing.`);
                    if (result.debug_logs) {
                        console.log(`--- Server Logs ---`);
                        console.log(result.debug_logs);
                        console.log(`-------------------`);
                    }
                }
            } else {
                console.log(`❌ FAILED: ${result.error}`);
            }
        } catch (error) {
            console.error(`❌ ERROR: ${error.message}`);
        }
    }
}

run().catch(console.error);
