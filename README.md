# AI PR Reviewer Chrome Extension

An AI-powered Chrome extension that reviews GitHub Pull Requests and GitLab Merge Requests directly in your browser.

---

## Installing the Extension (Developer Mode)

Since this extension is currently under development, it must be loaded in **Chrome Developer Mode**.

### 1. Download or Clone the Repository

Clone the repository:

```bash
git clone <repository-url>
```

or download the project as a ZIP and extract it.

---

### 2. Open Chrome Extensions

Open Chrome and navigate to:

```
chrome://extensions
```

---

### 3. Enable Developer Mode

Turn on the **Developer mode** toggle in the top-right corner.

---

### 4. Load the Extension

Click **Load unpacked**.

Select the project folder containing the extension's `manifest.json` file.

Example:

```
AI-PR-Reviewer/
│
├── manifest.json
├── content.js
├── background.js
├── github.js
├── gitlab.js
├── styles.css
└── ...
```

Once selected, the extension will appear in your installed extensions list.

---

## Using the Extension

1. Open a GitHub Pull Request or GitLab Merge Request.
2. Click the **AI PR Reviewer** extension icon in the Chrome toolbar.
3. The review panel will appear on the right side of the page.
4. Configure your settings:
   - Select an LLM provider.
   - Enter your LLM API key.
   - Add a GitHub Personal Access Token (for GitHub reviews).
   - Optionally sign in to GitLab using OAuth or provide a GitLab Personal Access Token.
5. Click **Save**.
6. Click **Review PR** to generate an AI review.

---

## Authentication

### GitHub

GitHub currently uses a **Personal Access Token (PAT)**.

Create a token with appropriate repository permissions and paste it into the GitHub Token field in the extension settings.

---

### GitLab

GitLab supports two authentication methods:

- OAuth (supported for configured GitLab instances)
- Personal Access Token (works for any GitLab instance)

If OAuth is unavailable for your GitLab server, simply provide a Personal Access Token in the settings.

---

## Updating the Extension

Whenever you make changes to the code:

1. Go to

```
chrome://extensions
```

2. Locate **AI PR Reviewer**.

3. Click the **Reload** button.

4. Refresh any GitHub or GitLab pages that were already open.

The latest version of the extension will now be running.

---

## Removing the Extension

1. Open

```
chrome://extensions
```

2. Locate **AI PR Reviewer**.

3. Click **Remove**.

---

## Requirements

- Google Chrome (latest version recommended)
- An API key for your chosen LLM provider
- GitHub Personal Access Token (for GitHub)
- GitLab OAuth or Personal Access Token (for GitLab)
