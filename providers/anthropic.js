async function reviewWithAnthropic(prompt) {
    const config = CONFIG.providers.anthropic;

    const response = await fetch (
        "https://api.anthropic.com/v1/messages",

        {
            method: "POST",

            headers: {
                "x-api-key": config.apiKey,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                model: config.model,

                max_tokens: 4096,

                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            })
        }
    );

    if (!response.ok) {
        throw new Error(await response.text());
    }

    const data = await response.json();

    return data.content[0].text
}