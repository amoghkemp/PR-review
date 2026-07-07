console.log("AI PR Reviewer loaded.");

const panel = document.createElement("div");

panel.id = "ai-review-panel";

panel.innerHTML = `
<div id="header">
    <span id="title">AI PR Reviewer</span>

    <div id="windowButtons">

        <button id="settingsButton">⚙</button>

        <button id="toggleButton">◀</button>

    </div>
    
</div>

<div id="settingsPanel" class="hidden">
    <h3>Settings</h3>

    <label>LLM Provider</label>

    <select id="provider">
        <option value="gemini">Gemini</option>
        <option value="openai">OpenAI</option>
        <option value="anthropic">Anthropic</option>
        <option value="ollama">Ollama</option>
        <option value="openrouter">OpenRouter</option>
    </select>

    <label>GitHub token</label>

    <input
        id="githubToken"
        type="password"
        placeholder="GitHub Personal Access Token">

    <label>API Key</label>

    <input
        id="apiKey"
        type="password"
        placeholder="LLM API Key">

    <button id="saveSettings">
        Save
    </button>

</div>

<button id="reviewButton">
    Review PR
</button>

<div id="result"></div>
<div id="resizeHandle"></div>
`;

document.body.appendChild(panel);

function updateLayout() {
    if (panel.classList.contains("collapsed")) {
        document.body.style.marginRight = "40px";
    }
    else {
        document.body.style.marginRight = panel.offsetWidth + "px";
    }
}

updateLayout();

const resizeObserver = new ResizeObserver(() => {
    updateLayout();
});

resizeObserver.observe(panel);

// load settings automatically
(async function loadSettings() {
    const settings = await chrome.storage.local.get([
        "provider",
        "githubToken",
        "apiKey"
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
})();

// code for the button to collapse extension
const toggleButton = document.getElementById("toggleButton");
toggleButton.addEventListener("click", () => {
    settingsPanel.classList.add("hidden");

    const collapsed = panel.classList.toggle("collapsed");

    toggleButton.textContent = collapsed ? "▶" : "◀";

    if (collapsed) {
        document.body.style.marginRight = "40px";
    }
    
    else {
        document.body.style.marginRight = panel.offsetWidth + "px";
    }
});

const settingsButton = document.getElementById("settingsButton");
const settingsPanel = document.getElementById("settingsPanel");

settingsButton.addEventListener("click", () => {
    settingsPanel.classList.toggle("hidden");
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
    panel.style.width = `${newWidth}px`;
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
            "apiKey"
        ]);


        if (!settings.githubToken || !settings.apiKey) {

            document.getElementById("result").innerText =
                "Please configure your settings first.";

            return;
        }

        console.log("Updating GitHub token");
        GITHUB_TOKEN = settings.githubToken;

        console.log("Updating provider");
        CONFIG.provider = settings.provider;

        console.log("Updating API Key")
        CONFIG.providers[settings.provider].apiKey = settings.apiKey;

        try {
            const pr = parsePullRequestURL(
                window.location.href
            );

            const pullRequest = await getPullRequest(
                pr.owner,
                pr.repo,
                pr.number
            );

            const files = await getChangedFiles(
                pr.owner,
                pr.repo,
                pr.number
            );

            const reviewFiles = [];

            for (const file of files) {
                let original = null;
                let modified = null;

                if (file.status !== "added") {
                    const data = await getFile(
                        pr.owner,
                        pr.repo,
                        file.filename,
                        pullRequest.base.sha
                    );

                    original = decodeContent(data);
                }

                if (file.status !== "removed") {
                    const data = await getFile(
                        pr.owner,
                        pr.repo,
                        file.filename,
                        pullRequest.head.sha
                    );

                    modified = decodeContent(data);
                }

                reviewFiles.push({
                    path: file.filename,
                    status: file.status,
                    patch: file.patch,
                    original,
                    modified
                });
            }

            const prompt = buildPrompt(
                pullRequest,
                reviewFiles
            );

            console.log(prompt);

    

            const review = await reviewPullRequest(prompt);

            console.log(review);

            // document.getElementById("result").innerText = review;

            await postPullRequestComment(
                pr.owner,
                pr.repo,
                pr.number,
                review
            );

            document.getElementById("result").innerText = review + "\n\n Review posted Successfully";
        }
        catch (error) {
            console.error(error);

            document.getElementById("result").innerText = error.message;
        }
    });


