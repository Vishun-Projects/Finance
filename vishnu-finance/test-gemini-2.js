const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    try {
        const model = genAI.getGenerativeModel({ model: "gemma-3-27b-it" });
        console.log("Attempting to generate TEXT with gemma-3-27b-it...");
        const result = await model.generateContent("Hello");
        console.log("Text Gen Success:", result.response.text());

        // Now try Image Gen with Imagen 2 if 3 failed?
        // Or maybe the user meant "gemini-pro-vision" (which is improper for gen)?
        // Let's try 'imagen-2'
        try {
            console.log("Attempting gemma-3-27b-it again as variant");
            const model2 = genAI.getGenerativeModel({ model: "gemma-3-27b-it" });
            await model2.generateContent("test");
        } catch (e) { console.log("gemma-3 failed:", e.message) }

    } catch (error) {
        console.error("Error:", error.message);
    }
}

listModels();
