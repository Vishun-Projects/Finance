const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    try {
        const model = genAI.getGenerativeModel({ model: "gemma-3-27b-it" });
        // Or imagen-4.0-fast-generate-001 for speed

        console.log("Attempting to generate content with gemma-3-27b-it...");
        const result = await model.generateContent("What is the current state of Indian finance?");
        console.log("Success! Response length:", result.response.text().length);
    } catch (error) {
        console.error("Error with gemma:", error.message);

        try {
            console.log("Attempting fallback to gemini-1.5-flash...");
            const modelFast = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            await modelFast.generateContent("Hello");
            console.log("Success flash!");
        } catch (e) {
            console.error("Error with flash:", e.message);
        }
    }
}

listModels();
