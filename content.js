console.log("AI PR Reviewer loaded.");

let panel = null;

const MODEL_OPTIONS = {
    gemini: [
        "gemini-2.5-flash-lite",
        "gemini-2.5-flash",
        "gemini-2.5-pro"
    ],
    openai: [
        "gpt-4.1-mini",
        "gpt-4.1",
        "gpt-4.1-nano"
    ],
    anthropic: [
        "claude-sonnet-4",
        "claude-opus-4",
        "claude-haiku-4"
    ]
};

function destroyPanel() {
    if (panel) {
        panel.remove();
        panel = null;
    }
}

function setResult(message, isError = false) {
    const result = document.getElementById("result");
    if (!result) return;

    result.classList.toggle("error", isError);
    result.innerText = message;
}

function setSettingsResult(message, isError = false) {
    const result = document.getElementById("settingsResult");
    if (!result) return;

    result.classList.toggle("error", isError);
    result.innerText = message;
}

function setSettingsSaving(isSaving) {
    const spinner = document.getElementById("settingsSpinner");
    if (!spinner) return;

    spinner.classList.toggle("hidden", !isSaving);
}

function clearSettingsResult() {
    setSettingsResult("");
    setSettingsSaving(false);
}

function setReviewLoading(isLoading) {
    const reviewButton = document.getElementById("reviewButton");
    const spinnerRow = document.getElementById("reviewSpinnerRow");
    const spinner = document.getElementById("reviewSpinner");
    const label = document.getElementById("reviewButtonLabel");

    if (!reviewButton || !spinnerRow || !spinner || !label) return;

    reviewButton.disabled = isLoading;
    reviewButton.classList.toggle("loading", isLoading);
    spinnerRow.classList.toggle("hidden", !isLoading);
    spinner.classList.toggle("hidden", !isLoading);
    spinner.setAttribute("aria-hidden", String(!isLoading));
    label.innerText = isLoading ? "Reviewing..." : "Review PR";
}

function setSettingsMode(enabled) {
    const panelElement = document.getElementById("ai-review-panel");
    const settingsPanel = document.getElementById("settingsPanel");
    const accountsPanel = document.getElementById("accountsPanel");
    const autoPostContainer = document.getElementById("autoPostContainer");
    const reviewButton = document.getElementById("reviewButton");
    const result = document.getElementById("result");
    const resizeHandle = document.getElementById("resizeHandle");

    if (!panelElement || !settingsPanel) return;

    panelElement.classList.toggle("settings-open", enabled);
    settingsPanel.classList.toggle("hidden", !enabled);

    if (accountsPanel) accountsPanel.classList.toggle("hidden", enabled);
    if (autoPostContainer) autoPostContainer.classList.toggle("hidden", enabled);
    if (reviewButton) reviewButton.classList.toggle("hidden", enabled);
    if (result) result.classList.toggle("hidden", enabled);
    if (resizeHandle) resizeHandle.classList.toggle("hidden", enabled);
}

function populateModelOptions(provider, selectedModel) {
    const modelSelect = document.getElementById("model");
    if (!modelSelect) return;

    const models = MODEL_OPTIONS[provider] || [];
    modelSelect.innerHTML = models
        .map((model) => `<option value="${model}">${model}</option>`)
        .join("");

    if (selectedModel && models.includes(selectedModel)) {
        modelSelect.value = selectedModel;
    }
}

async function setGitlabTokenEditingEnabled(enabled) {
    const tokenInput = document.getElementById("gitlabToken");

    if (!tokenInput) return;

    tokenInput.disabled = !enabled;
    tokenInput.classList.toggle("disabledField", !enabled);
}

async function updateAccountUI() {
    const settings = await chrome.storage.local.get([
        "githubToken",
        "gitlabToken"
    ]);
    const gitlab = await getGitlabSession();

    const githubStatus = document.getElementById("githubStatus");
    const githubButton = document.getElementById("githubAuthButton");

    if (settings.githubToken) {
        githubStatus.innerText = "✓ Configured";
        githubButton.innerText = "Change";
    }
    else {
        githubStatus.innerText = "Not Configured";
        githubButton.innerText = "Add Token";
    }

    const gitlabStatus = document.getElementById("gitlabStatus");
    const gitlabButton = document.getElementById("gitlabAuthButton");

    if (gitlab) {
        const userLabel = gitlab.username ? ` ${gitlab.username}` : "";
        gitlabStatus.innerText = `✓${userLabel}`;
        gitlabButton.innerText = "Sign Out";
        await chrome.storage.local.remove("gitlabToken");
        const tokenInput = document.getElementById("gitlabToken");
        if (tokenInput) {
            tokenInput.value = "";
        }
        await setGitlabTokenEditingEnabled(false);
    }
    else if (settings.gitlabToken) {
        gitlabStatus.innerText = "✓ Token saved";
        gitlabButton.innerText = "Clear Token";
        await setGitlabTokenEditingEnabled(true);
    }
    else {
        gitlabStatus.innerText = "Not Signed In";
        gitlabButton.innerText = "Sign In";
        await setGitlabTokenEditingEnabled(true);
    }
}

function createPanel() {
    const newPanel = document.createElement("div");

    newPanel.id = "ai-review-panel";

    newPanel.innerHTML = `
    <div id="header">
        <span id="title">AI PR Reviewer</span>

        <div id="windowButtons">

            <button id="settingsButton">⚙</button>
            <button id="toggleButton">◀</button>
            <button id="closeButton">✕</button>

        </div>
        
    </div>

    <div id="settingsPanel" class="hidden">
        <h3>Settings</h3>

        <label>LLM Provider</label>

        <select id="provider">
            <option value="gemini">Gemini</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
        </select>

        <label>Model</label>

        <select id="model"></select>

        <label>Github token</label>

        <input
            id="githubToken"
            type="password"
            placeholder="Github Personal Access Token">

        <label>Gitlab token</label>

        <input
            id="gitlabToken"
            type="password"
            placeholder="Gitlab Personal Access Token">

        <label>API Key</label>

        <input
            id="apiKey"
            type="password"
            placeholder="LLM API Key">

        <button id="saveSettings">
            Save
        </button>

        <div id="settingsResultRow">
            <span id="settingsSpinner" class="spinner hidden"></span>
            <div id="settingsResult"></div>
        </div>

    </div>

    <div id="accountsPanel">
        <h3>Accounts</h3>

        <div class="accountRow">
            <span>Github</span>

            <span id="githubStatus">Add Token</span>

            <button id="githubAuthButton">
                Sign In
            </button>
        </div>

        <div class="accountRow">
            <span>GitLab</span>

            <span id="gitlabStatus">Not signed In</span>

            <button id="gitlabAuthButton">
                Sign In
            </button>
        </div>
    </div>

    <label id="autoPostContainer">
        Post comment automatically
        <input
            id="autoPost"
            type="checkbox">
    </label>

    <div id="reviewActionRow">
        <button id="reviewButton">
            <span id="reviewButtonLabel">Review PR</span>
        </button>
        <div id="reviewSpinnerRow" class="hidden">
            <span id="reviewSpinner" class="hidden" aria-hidden="true"></span>
        </div>
    </div>

    <div id="result"></div>
    <div id="resizeHandle"></div>
    `;

    document.body.appendChild(newPanel);

    function updateLayout() {
        if (newPanel.classList.contains("collapsed")) {
            document.body.style.marginRight = "40px";
        }
        else {
            document.body.style.marginRight = newPanel.offsetWidth + "px";
        }
    }

    updateLayout();

    const resizeObserver = new ResizeObserver(() => {
        updateLayout();
    });

    resizeObserver.observe(newPanel);

    // load settings automatically
    (async function loadSettings() {
        const settings = await chrome.storage.local.get([
            "provider",
            "model",
            "githubToken",
            "gitlabToken",
            "apiKey",
            "autoPost"
        ]);

        const provider = settings.provider || CONFIG.provider;
        document.getElementById("provider").value = provider;
        populateModelOptions(provider, settings.model || CONFIG.providers[provider].model);

        if (settings.provider) {
            CONFIG.provider = settings.provider;
        }
        if (settings.githubToken) {
            document.getElementById("githubToken").value =
                settings.githubToken;
        }

        if (settings.apiKey) {
        document.getElementById("apiKey").value =
            settings.apiKey;
        }

        if (settings.gitlabToken) {
            document.getElementById("gitlabToken").value =
                settings.gitlabToken;
        }

        document.getElementById("autoPost").checked = settings.autoPost ?? false;

    })();

    updateAccountUI();

    document.getElementById("provider").addEventListener("change", (event) => {
        populateModelOptions(event.target.value);
        clearSettingsResult();
    });

    // code for the button to collapse extension
    const toggleButton = document.getElementById("toggleButton");
    toggleButton.addEventListener("click", () => {
        settingsPanel.classList.add("hidden");

        const collapsed = newPanel.classList.toggle("collapsed");

        toggleButton.textContent = collapsed ? "▶" : "◀";

        if (collapsed) {
            document.body.style.marginRight = "40px";
        }
        
        else {
            document.body.style.marginRight = newPanel.offsetWidth + "px";
        }
    });

    const settingsButton = document.getElementById("settingsButton");
    const settingsPanel = document.getElementById("settingsPanel");

    settingsButton.addEventListener("click", () => {
        const isHidden = settingsPanel.classList.contains("hidden");
        setSettingsMode(isHidden);
    });

    // close button
    const closeButton = document.getElementById("closeButton");
    closeButton.addEventListener("click", destroyPanel);

    // auto post check box
    const autoPostCheckbox = document.getElementById("autoPost");
    autoPostCheckbox.addEventListener("change", async () => {
        await chrome.storage.local.set({
            autoPost: autoPostCheckbox.checked
        });
    });

    [
        "provider",
        "model",
        "githubToken",
        "gitlabToken",
        "apiKey"
    ].forEach((id) => {
        const element = document.getElementById(id);
        if (!element) return;

        element.addEventListener("input", clearSettingsResult);
        element.addEventListener("change", clearSettingsResult);
    });

    // Github Button logic
    document
        .getElementById("githubAuthButton")
        .addEventListener("click", async () => {
            settingsPanel.classList.remove("hidden");
            setSettingsMode(true);
            document.getElementById("githubToken").focus();
        });

    // Gitlab Button logic
    document
        .getElementById("gitlabAuthButton")
        .addEventListener("click", async () => {

            console.log("Gitlab button clicked");

            const session = await getGitlabSession();
            const settings = await chrome.storage.local.get("gitlabToken");

            if (session) {
                console.log("Logging Out");
                await clearGitlabSession();
                await updateAccountUI();
                setResult("Signed out of GitLab.");
            }
            else if (settings.gitlabToken) {
                await chrome.storage.local.remove("gitlabToken");
                const tokenInput = document.getElementById("gitlabToken");
                if (tokenInput) {
                    tokenInput.value = "";
                }
                await updateAccountUI();
                setResult("GitLab token cleared.");
            }
            else {
                const response = await chrome.runtime.sendMessage({
                    action: "gitlab-login",
                    host: window.location.hostname
                });

                if (response?.success) {
                    await chrome.storage.local.remove("gitlabToken");
                    const tokenInput = document.getElementById("gitlabToken");
                    if (tokenInput) {
                        tokenInput.value = "";
                    }
                    setResult("Signed in to GitLab.");
                    await updateAccountUI();
                }
                else {
                    const message = response?.error || "GitLab sign-in failed.";
                    console.error(message);
                    setResult(message, true);
                }
            }

            await updateAccountUI();
        });

    // resize handle
    const resizeHandle = document.getElementById("resizeHandle");

    let resizing = false;

    resizeHandle.addEventListener("mousedown", (e) => {
        resizing = true;
        e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
        if (!resizing) return;

        let newWidth = window.innerWidth - e.clientX;
        newWidth = Math.max(300, Math.min(700, newWidth));
        newPanel.style.width = `${newWidth}px`;
        updateLayout();
    });

    document.addEventListener("mouseup", () => {
        resizing = false;
    });

    // to save settings
    document
        .getElementById("saveSettings")
        .addEventListener("click", async () => {
            const settings = {
                provider: document.getElementById("provider").value,
                model: document.getElementById("model").value,
                githubToken: document.getElementById("githubToken").value,
                gitlabToken: document.getElementById("gitlabToken").value,
                apiKey: document.getElementById("apiKey").value
            };

            console.log(settings);

            setSettingsResult("");
            setSettingsSaving(true);

            await chrome.storage.local.set(settings)
            CONFIG.provider = settings.provider;
            CONFIG.providers[settings.provider].model = settings.model;
            CONFIG.providers[settings.provider].apiKey = settings.apiKey;
            setSettingsSaving(false);
            setSettingsResult("Settings saved successfully");
            await updateAccountUI();
        });

    // for review button logic after clicking
    document
        .getElementById("reviewButton")
        .addEventListener("click", async () => {

            console.log("Review button clicked");
            setResult("Reviewing PR...");
            setReviewLoading(true);

            try {
                const settings = await chrome.storage.local.get([
                    "provider",
                    "githubToken",
                    "gitlabToken",
                    "apiKey",
                    "autoPost"
                ]);

                detectGitProvider(window.location.href);

                if (!settings.apiKey) {
                    throw new Error("Please configure your LLM API key first.");
                }

                if (GIT_PROVIDER === "github" && !settings.githubToken) {
                    throw new Error("Please configure your GitHub token.");
                }

                if (GIT_PROVIDER === "gitlab") {
                    const session = await getGitlabSession();
                    const hasGitlabToken = Boolean(settings.gitlabToken);

                    if (!session && !hasGitlabToken) {
                        throw new Error("Please sign in to GitLab or add a GitLab token.");
                    }
                }

                console.log("Updating Git token");
                if (GIT_PROVIDER === "github") {
                    GITHUB_TOKEN = settings.githubToken;
                }

                console.log("Updating provider");
                CONFIG.provider = settings.provider;

                console.log("Updating API Key")
                CONFIG.providers[settings.provider].apiKey = settings.apiKey;
                CONFIG.providers[settings.provider].model = settings.model || CONFIG.providers[settings.provider].model;

                const pr = parseReviewURL(window.location.href);

                const reviewData = await getReview(pr);

                const files = await getReviewFiles(pr);
                const repositoryFiles = await getRepositoryFiles(
                    pr,
                    GIT_PROVIDER === "github"
                        ? reviewData.base.sha
                        : reviewData.diff_refs.base_sha
                );

                const reviewFiles = [];

                for (const file of files) {
                    let original = null;
                    let modified = null;

                    const path = GIT_PROVIDER === "github" ? file.filename : file.new_path;

                    const added = GIT_PROVIDER === "github" ? file.status === "added" : file.new_file;
                    if (!added) {
                        const data = await getReviewFile(
                            pr,
                            path,
                            GIT_PROVIDER === "github"
                                ? reviewData.base.sha
                                : reviewData.diff_refs.base_sha
                        );

                        original = decodeFile(data);
                    }

                    const removed = GIT_PROVIDER === "github" ? file.status === "removed" : file.deleted_file;
                    if (!removed) {
                        const data = await getReviewFile(
                            pr,
                            path,
                            GIT_PROVIDER === "github"
                                ? reviewData.head.sha
                                : reviewData.diff_refs.head_sha
                        );

                        modified = decodeFile(data);
                    }

                    reviewFiles.push({
                        path,

                        status:
                            GIT_PROVIDER === "github"
                                ? file.status
                                : added
                                    ? "added"
                                    : removed
                                        ? "removed"
                                        : "modified",
                        patch:
                            GIT_PROVIDER === "github"
                                ? file.patch
                                : file.diff,
                        
                        original,
                        modified
                    });
                }

                const prompt = buildPrompt(
                    reviewData,
                    reviewFiles,
                    repositoryFiles
                );

                console.log(prompt);

        

                const review = await reviewPullRequest(prompt);

                console.log(review);

                if (settings.autoPost) {
                    await postReviewComment(
                        pr,
                        review
                    );

                    setResult(review + "\n\nReview posted successfully");
                }
                else {
                    setResult(review);

                    document.getElementById("postCommentButton") ?.remove();

                    const postButton = document.createElement("button");

                    postButton.id = "postCommentButton";
                    postButton.innerText = "Post Comment";

                    postButton.addEventListener("click", async () => {
                        await postReviewComment(pr, review);
                        postButton.remove();

                        document.getElementById("result").innerText += "\n\nReview posted successfully";
                    });
                    newPanel.appendChild(postButton);
                }
            }
            catch (error) {
                console.error(error);
                setResult(error.message || "Something went wrong while reviewing the PR.", true);
            }
            finally {
                setReviewLoading(false);
            }
        });
    
    return newPanel;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "ping") {
        sendResponse({ alive: true });
        return;
    }

    if (message.action === "toggle-panel") {
        if (panel === null) {
            panel = createPanel();
        }
        else {
            destroyPanel();
        }
    }
});
