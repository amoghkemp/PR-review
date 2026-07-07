const CONFIG = {

    provider: "gemini",

    providers: {

        gemini: {
            apiKey: "",
            model: "gemini-2.5-flash"
        },

        openai: {
            apiKey: "",
            model: "gpt-4.1"
        },

        anthropic: {
            apiKey: "",
            model: "claude-sonnet-4"
        },

        ollama: {
            baseUrl: "http://localhost:11434",
            model: "llama3.1"
        },

        openrouter: {
            apiKey: "",
            model: "anthropic/claude-sonnet-4"
        }
    }
};