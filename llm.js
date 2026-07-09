async function reviewPullRequest(prompt) {

    switch (CONFIG.provider) {
        case "openai":
            return reviewWithOpenAI(prompt);
        case "anthropic":
            return reviewWithAnthropic(prompt);
        case "gemini":
            return reviewWithGemini(prompt);
        default:
            throw new Error("Unsupported LLM provider.");
    }

}