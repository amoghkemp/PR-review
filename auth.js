async function getGitlabSession() {
    const { gitlab } = await chrome.storage.local.get("gitlab");
    return gitlab || null;
}

async function saveGitlabSession(session) {
    await chrome.storage.local.set({
        gitlab: session
    });
}

async function clearGitlabSession() {
    await chrome.storage.local.remove("gitlab");
}
