let GIT_PROVIDER = "github";

function detectGitProvider(url) {
    if (url.includes("github.com")) {
        GIT_PROVIDER = "github";
    }
    else {
        GIT_PROVIDER = "gitlab";
    }
}

function parseReviewURL(url) {
    if (GIT_PROVIDER === "github") {
        return parsePullRequestURL(url);
    }

    return parseMergeRequestURL(url);
}

async function getReview(p) {
    if (GIT_PROVIDER === "github") {
        return getPullRequest(
            p.owner,
            p.repo,
            p.number
        );
    }

    return getMergeRequest(
        p.project,
        p.number
    );
}

async function getReviewFiles(p) {
    if (GIT_PROVIDER === "github") {
        return getChangedFiles(
            p.owner,
            p.repo,
            p.number
        );
    }

    return getMergeRequestFiles(
        p.project,
        p.number
    );
}

async function getReviewFile(p, path, ref) {
    if (GIT_PROVIDER === "github") {
        return getFile(
            p.owner,
            p.repo,
            path,
            ref
        );
    }

    return getGitLabFile(
        p.project,
        path,
        ref
    );
}

function decodeFile(data) {
    if (GIT_PROVIDER === "github") {
        return decodeContent(data);
    }

    return decodeGitLabContent(data);
}

async function postReviewComment(p, body) {
    if (GIT_PROVIDER === "github") {
        return postPullRequestComment(
            p.owner,
            p.repo,
            p.number,
            body
        );
    }

    return postMergeRequestComment(
        p.project,
        p.number,
        body
    );
}