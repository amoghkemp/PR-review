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