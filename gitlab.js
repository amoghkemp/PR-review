// let GITLAB_TOKEN = "";
let GITLAB_HOST = "";

async function getGitlabAuth() {
    const session = await getGitlabSession();

    if (session?.accessToken) {
        return {
            source: "oauth",
            session,
            headerName: "Authorization",
            headerValue: `Bearer ${session.accessToken}`
        };
    }

    const { gitlabToken } = await chrome.storage.local.get("gitlabToken");

    if (gitlabToken) {
        return {
            source: "token",
            headerName: "PRIVATE-TOKEN",
            headerValue: gitlabToken
        };
    }

    throw new Error("Please sign in to GitLab or configure a GitLab token.");
}

async function gitlabRequest(url) {
    const response = await gitlabFetch(url);

    if (!response.ok) {
        throw new Error(await response.text());
    }

    return await response.json();
}

async function gitlabFetch(url) {
    console.log("Request:", url);

    const auth = await getGitlabAuth();
    let response = await fetch(url, {
        headers: {
            [auth.headerName]: auth.headerValue
        }
    });

    if (response.status === 401 && auth.source === "oauth" && auth.session?.refreshToken) {
        const refreshed = await chrome.runtime.sendMessage({
            action: "gitlab-refresh-session",
            session: auth.session
        });

        if (refreshed?.success) {
            const refreshedAuth = await getGitlabAuth();
            response = await fetch(url, {
                headers: {
                    [refreshedAuth.headerName]: refreshedAuth.headerValue
                }
            });

            return response;
        }
    }

    return response;
}


function parseMergeRequestURL(url) {
    const parsed = new URL(url);

    GITLAB_HOST = parsed.origin;

    const match = parsed.pathname.match(
        /^\/(.+)\/-\/merge_requests\/(\d+)$/
    );

    if (!match) {
        throw new Error("Not a GitLab Merge Request.");
    }

    return {
        project: encodeURIComponent(match[1]),
        number: match[2]
    };
}

async function getMergeRequest(project, number) {
    return gitlabRequest(
        `${GITLAB_HOST}/api/v4/projects/${project}/merge_requests/${number}`
    );
}

async function getMergeRequestFiles(project, number) {
    const data = await gitlabRequest(
        `${GITLAB_HOST}/api/v4/projects/${project}/merge_requests/${number}/changes`
    );

    return data.changes;
}

async function getGitLabFile(project, path, ref) {
    const encoded = encodeURIComponent(path);

    return gitlabRequest(
        `${GITLAB_HOST}/api/v4/projects/${project}/repository/files/${encoded}?ref=${encodeURIComponent(ref)}`
    );
}

async function getGitlabRepositoryFiles(project, ref) {
    const files = [];
    let page = 1;

    while (true) {
        const response = await gitlabFetch(
            `${GITLAB_HOST}/api/v4/projects/${project}/repository/tree?ref=${encodeURIComponent(ref)}&recursive=true&per_page=100&page=${page}`
        );

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const entries = await response.json();

        for (const entry of entries) {
            if (entry.type !== "blob" || !entry.path) {
                continue;
            }

            const data = await getGitLabFile(project, entry.path, ref);
            const content = decodeGitLabContent(data);

            if (content === null) {
                continue;
            }

            files.push({
                path: entry.path,
                content
            });
        }

        const nextPage = response.headers.get("X-Next-Page");
        if (!nextPage) {
            break;
        }

        page = Number(nextPage);
        if (!page) {
            break;
        }
    }

    return files;
}

function decodeGitLabContent(file) {
    if (!file.content) {
        return null;
    }

    return atob(file.content);
}

async function postMergeRequestComment(project, number, body) {
    const auth = await getGitlabAuth();

    const response = await fetch (
        `${GITLAB_HOST}/api/v4/projects/${project}/merge_requests/${number}/notes`,

        {
            method: "POST",

            headers: {
                [auth.headerName]: auth.headerValue,
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                body
            })
        }
    );

    if (!response.ok) {
        throw new Error(await response.text());
    }

    return await response.json();
}
