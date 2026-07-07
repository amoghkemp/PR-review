async function reviewWithGemini(prompt) {

    const config = CONFIG.providers.gemini;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: prompt
                            }
                        ]
                    }
                ]
            })
        }
    );

    if (!response.ok) {
        throw new Error(await response.text());
    }

    const data = await response.json();

    return data.candidates[0].content.parts[0].text;
}