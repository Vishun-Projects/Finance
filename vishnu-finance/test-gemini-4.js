const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    try {
        const model = genAI.getGenerativeModel({ model: "imagen-4.0-generate-001" });
        // Or imagen-4.0-fast-generate-001 for speed

        console.log("Attempting to generate image with imagen-4.0-generate-001...");
        const result = await model.generateContent("A cute robot, minimalist flat design");
        console.log("Success! Response parts:", result.response.candidates[0].content.parts.length);
        // console.log(result.response.candidates[0].content.parts[0]); 
    } catch (error) {
        console.error("Error with 4.0:", error.message);

        try {
            console.log("Attempting imagen-4.0-fast-generate-001...");
            const modelFast = genAI.getGenerativeModel({ model: "imagen-4.0-fast-generate-001" });
            await modelFast.generateContent("A cute robot");
            console.log("Success fast!");
        } catch (e) {
            console.error("Error with fast:", e.message);
        }
    }
}

listModels();
