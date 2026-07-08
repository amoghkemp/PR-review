async function reviewWithOpenAI(prompt) {

    const config = CONFIG.providers.openai;

    const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
            method: "POST",

            headers: {
                "Authorization": `Bearer ${config.apiKey}`,
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                model: config.model,

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

    return data.choices[0].message.content;
}