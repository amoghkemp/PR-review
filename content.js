console.log("AI PR Reviewer loaded.");

let panel = null;

function destroyPanel() {
    if (panel) {
        panel.remove();
        panel = null;
    }
}

async function updateAccountUI() {
    const settings = await chrome.storage.local.get("githubToken");
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
        gitlabStatus.innerText = "✓ " + gitlab.username;
        gitlabButton.innerText = "Sign Out";
    }
    else {
        gitlabStatus.innerText = "Not Signed In";
        gitlabButton.innerText = "Sign In";
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

        <label>Github token</label>

        <input
            id="githubToken"
            type="password"
            placeholder="Github Personal Access Token">

        <label>API Key</label>

        <input
            id="apiKey"
            type="password"
            placeholder="LLM API Key">

        <button id="saveSettings">
            Save
        </button>

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

    <button id="reviewButton">
        Review PR
    </button>

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
            "githubToken",
            "apiKey",
            "autoPost"
        ]);

        if (settings.provider) {
            document.getElementById("provider").value = settings.provider;
        }
        if (settings.githubToken) {
            document.getElementById("githubToken").value =
                settings.githubToken;
        }

        if (settings.apiKey) {
            document.getElementById("apiKey").value =
                settings.apiKey;
        }

        document.getElementById("autoPost").checked = settings.autoPost ?? false;

    })();

    updateAccountUI();

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
        settingsPanel.classList.toggle("hidden");
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

    // Github Button logic
    document
        .getElementById("githubAuthButton")
        .addEventListener("click", async () => {
            settingsPanel.classList.remove("hidden");
            document.getElementById("githubToken").focus();
        });

    // Gitlab Button logic
    document
        .getElementById("gitlabAuthButton")
        .addEventListener("click", async () => {

            console.log("Gitlab button clicked");

            const session = await getGitlabSession();

            if (session) {
                console.log("Logging Out");
                await clearGitlabSession();
            }
            else {
                const response = await chrome.runtime.sendMessage({
                    action: "gitlab-login",
                    host: window.location.hostname
                });

                if (response?.success) {
                    await updateAccountUI();
                }
                else {
                    console.error(response?.error);
                }
            }

            updateAccountUI();
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
                githubToken: document.getElementById("githubToken").value,
                apiKey: document.getElementById("apiKey").value
            };

            console.log(settings);

            await chrome.storage.local.set(settings)
            document.getElementById("result").innerText = "Settings saved successfully";
        });

    // for review button logic after clicking
    document
        .getElementById("reviewButton")
        .addEventListener("click", async () => {

            console.log("Review button clicked");
            document.getElementById("result").innerText = "Reviewing PR...";

            const settings = await chrome.storage.local.get([
                "provider",
                "githubToken",
                "apiKey",
                "autoPost"
            ]);

            detectGitProvider(window.location.href);


            if (!settings.apiKey) {
                document.getElementById("result").innerText = "Please configure your LLM API key first.";
                return;
            }

            if (GIT_PROVIDER === "github" && !settings.githubToken) {
                document.getElementById("result").innerText = "Please configure your GitHub token.";
                return;
            }

            if (GIT_PROVIDER === "gitlab") {
                const session = await getGitlabSession();

                console.log(await chrome.storage.local.get("gitlab"));

                if (!session) {
                    document.getElementById("result").innerText = "Please sign in to GitLab.";
                    return;
                }
            }

            console.log("Updating Git token");
            if (GIT_PROVIDER === "github") {
                GITHUB_TOKEN = settings.githubToken;
            }
            // else{
            //     GITLAB_TOKEN = settings.gitToken;
            // }
            

            console.log("Updating provider");
            CONFIG.provider = settings.provider;

            console.log("Updating API Key")
            CONFIG.providers[settings.provider].apiKey = settings.apiKey;

            try {
                const pr = parseReviewURL(window.location.href);

                const reviewData = await getReview(pr);

                const files = await getReviewFiles(pr);

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
                    reviewFiles
                );

                console.log(prompt);

        

                const review = await reviewPullRequest(prompt);

                console.log(review);

                if (settings.autoPost) {
                    await postReviewComment(
                        pr,
                        review
                    );

                    document.getElementById("result").innerText = review + "\n\n Review posted Successfully";
                }
                else {
                    document.getElementById("result").innerText = review;

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

                document.getElementById("result").innerText = error.message;
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
