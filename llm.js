async function reviewPullRequest(prompt) {

    switch (CONFIG.provider) {
        case "openai":
            return reviewWithOpenAI(prompt);
        case "anthropic":
            return reviewWithAnthropic(prompt);
        case "gemini":
            return reviewWithGemini(prompt);
        case "ollama":
            return reviewWithOllama(prompt);
        case "openrouter":
            return reviewWithOpenRouter(prompt);
        default:
            throw new Error("Unsupported LLM provider.");
    }

}