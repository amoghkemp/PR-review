let GITHUB_TOKEN = "";

async function githubRequest(url) {

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github+json"
        }
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }

    return await response.json();
}

function parsePullRequestURL(url) {

    const match = url.match(
        /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/
    );

    if (!match) {
        throw new Error("Not a GitHub Pull Request.");
    }

    return {
        owner: match[1],
        repo: match[2],
        number: match[3]
    };
}

async function getPullRequest(owner, repo, number) {

    return githubRequest(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`
    );
}

async function getChangedFiles(owner, repo, number) {

    return githubRequest(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${number}/files`
    );
}

async function getRepositoryTree(owner, repo, ref) {
    return githubRequest(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`
    );
}

async function getFile(owner, repo, path, ref) {
    const encoded = path
        .split("/")
        .map(encodeURIComponent)
        .join("/");

    return githubRequest(
        `https://api.github.com/repos/${owner}/${repo}/contents/${encoded}?ref=${ref}`
    );
}

async function getGithubRepositoryFiles(owner, repo, ref) {
    const tree = await getRepositoryTree(owner, repo, ref);
    const entries = tree.tree ?? [];
    const files = [];

    for (const entry of entries) {
        if (entry.type !== "blob" || !entry.path) {
            continue;
        }

        const data = await getFile(owner, repo, entry.path, ref);
        const content = decodeContent(data);

        if (content === null) {
            continue;
        }

        files.push({
            path: entry.path,
            content
        });
    }

    return files;
}

function decodeContent(file) {
    if (!file.content) {
        return null;
    }

    return atob (
        file.content.replace(/\n/g, "")
    );
}

async function postPullRequestComment(owner, repo, number, body) {
    return fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues/${number}/comments`,
        {
            method: "POST",

            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                Accept: "application/vnd.github+json",
                "Content-Type": "application/json"
            },

            body: JSON.stringify({body})
        }
    );
}
