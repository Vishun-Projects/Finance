const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    try {
        console.log("Using Key:", process.env.GOOGLE_API_KEY ? "Present..." : "Missing");
        const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });
        // There isn't a direct listModels method on the client instance in some SDK versions, 
        // but usually we can try to generate simple content or check via a specific call if available.
        // Actually, the Node SDK doesn't expose listModels directly on the genAI instance in recent versions easily without using the model manager.
        // Let's try to just generate a dummy image to see if it 404s.

        console.log("Attempting to generate dummy image...");
        const result = await model.generateContent("Test");
        console.log("Success:", result);
    } catch (error) {
        console.error("Error:", error.message);
    }
}

listModels();
