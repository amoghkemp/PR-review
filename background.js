const GITLAB_OAUTH = {
    "gitlab.com" : {
        clientId: "f5855d00c0aecd21ebe6bc14f4ff9357a055851aa18b3ba105bd5caf8e0feb44"
    }
};

async function ensurePermission(origin) {
    const hasPermission = await chrome.permissions.contains({
        origins: [origin]
    });

    if (hasPermission) {
        return true;
    }

    return await chrome.permissions.request({
        origins: [origin]
    });
}

chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.id || !tab.url) {
        return;
    }

    const url = new URL(tab.url);

    const isGithub = url.hostname === "github.com" && url.pathname.includes("/pull/");

    const isGitlab = url.pathname.includes("/-/merge_requests/");

    if (!isGithub && !isGitlab) {
        console.log("Not a supported PR/MR page.");
        return;
    }

    // request permission for self-hosted gitlab
    if (isGitlab && url.hostname !== "gitlab.com") {
        const granted = await ensurePermission(
            `${url.origin}/*`
        );

        if (!granted) {
            console.log("Permission denied");
            return;
        }
    }

    try {
        chrome.tabs.sendMessage(
            tab.id,
            { action: "ping" },
            async () => {
                if (chrome.runtime.lastError) {
                    await chrome.scripting.insertCSS({
                        target: {
                            tabId: tab.id
                        },
                        files: [
                            "styles.css"
                        ]
                    });


                    await chrome.scripting.executeScript({
                        target: {
                            tabId: tab.id
                        },
                        files: [
                            "config.js",
                            "auth.js",
                            "github.js",
                            "gitlab.js",
                            "git.js",
                            "promptBuilder.js",
                            "providers/gemini.js",
                            "llm.js",
                            "content.js"
                        ]
                    });

                    chrome.tabs.sendMessage(tab.id, {
                        action: "toggle-panel"
                    });
                }
                else {
                    // already injected
                    chrome.tabs.sendMessage(tab.id, {
                        action: "toggle-panel"
                    });
                }
            }
        );
    }
    catch (error) {
        console.error(error);
    }

});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "gitlab-login") {
        (async () => {
            try {
                const host = message.host;
                const config = GITLAB_OAUTH[host];

                if (!config) {
                    throw new Error("OAuth not configured for " + host);
                }

                const redirectUri = chrome.identity.getRedirectURL();

                const authUrl =
                    `https://${host}/oauth/authorize`
                    + `?client_id=${encodeURIComponent(config.clientId)}`
                    + `&redirect_uri=${encodeURIComponent(redirectUri)}`
                    + `&response_type=code`
                    + `&scope=api`;

                const responseUrl = await chrome.identity.launchWebAuthFlow({
                    url: authUrl,
                    interactive: true
                });

                if (!responseUrl) {
                    sendResponse();
                    return;
                }

                const code = new URL(responseUrl).searchParams.get("code");

                const tokenResponse = await fetch(
                    `https://${host}/oauth/token`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded"
                        },

                        body: new URLSearchParams({
                            client_id: config.clientId,
                            code,
                            grant_type: "authorization_code",
                            redirect_uri: redirectUri
                        })
                    }
                );

                if (!tokenResponse.ok) {
                    throw new Error(await tokenResponse.text());
                }

                const token = await tokenResponse.json();

                const userResponse = await fetch (
                    `https://${host}/api/v4/user`,
                    {
                        headers: {
                            Authorization: `Bearer ${token.access_token}`
                        }
                    }
                );

                if (!userResponse.ok) {
                    throw new Error(await userResponse.text());
                }

                const user = await userResponse.json();

                await chrome.storage.local.set({
                    gitlab: {
                        host: `https://${host}`,
                        accessToken: token.access_token,
                        refreshToken: token.refresh_token || null,
                        tokenType: "oauth",
                        username: user.username
                    }
                });

                await chrome.storage.local.remove("gitlabToken");

                sendResponse({
                    success: true
                });
            }
            catch (error) {
                console.error(error);

                sendResponse({
                    success: false,
                    error: error.message
                });
            }
        })();

        return true;
    }

    if (message.action === "gitlab-refresh-session") {
        (async () => {
            try {
                const session = message.session;
                const host = session?.host ? new URL(session.host).hostname : null;
                const config = host ? GITLAB_OAUTH[host] : null;

                if (!session || session.tokenType !== "oauth" || !session.refreshToken || !config || !host) {
                    throw new Error("No refreshable GitLab session found.");
                }

                const redirectUri = chrome.identity.getRedirectURL();
                const tokenResponse = await fetch(
                    `https://${host}/oauth/token`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded"
                        },

                        body: new URLSearchParams({
                            client_id: config.clientId,
                            grant_type: "refresh_token",
                            refresh_token: session.refreshToken,
                            redirect_uri: redirectUri
                        })
                    }
                );

                if (!tokenResponse.ok) {
                    throw new Error(await tokenResponse.text());
                }

                const token = await tokenResponse.json();
                const userResponse = await fetch(
                    `https://${host}/api/v4/user`,
                    {
                        headers: {
                            Authorization: `Bearer ${token.access_token}`
                        }
                    }
                );

                if (!userResponse.ok) {
                    throw new Error(await userResponse.text());
                }

                const user = await userResponse.json();

                const updatedSession = {
                    ...session,
                    accessToken: token.access_token,
                    refreshToken: token.refresh_token || session.refreshToken,
                    tokenType: "oauth",
                    username: user.username
                };

                await chrome.storage.local.set({
                    gitlab: updatedSession
                });

                sendResponse({
                    success: true,
                    session: updatedSession
                });
            }
            catch (error) {
                console.error(error);
                sendResponse({
                    success: false,
                    error: error.message
                });
            }
        })();

        return true;
    }
});
