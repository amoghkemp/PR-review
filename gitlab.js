let GITLAB_TOKEN = "";
let GITLAB_HOST = "";

async function gitlabRequest(url) {
    console.log("Request:", url);

    const response = await fetch(url, {
        headers: {
            "PRIVATE-TOKEN": GITLAB_TOKEN
        }
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }

    return await response.json();
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

function decodeGitLabContent(file) {
    if (!file.content) {
        return null;
    }

    return atob(file.content);
}

async function postMergeRequestComment(project, number, body) {
    const response = await fetch (
        `${GITLAB_HOST}/api/v4/projects/${project}/merge_requests/${number}/notes`,

        {
            method: "POST",

            headers: {
                "PRIVATE-TOKEN": GITLAB_TOKEN,
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