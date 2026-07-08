function buildPrompt(pullRequest, files) {
    let repository;
    let description;
    let sourceBranch;
    let targetBranch;

    if (GIT_PROVIDER === "github") {
        repository = pullRequest.base.repo.full_name;

        description = pullRequest.body ?? "";

        sourceBranch = pullRequest.head.ref;

        targetBranch = pullRequest.base.ref;
    }
    else {
        repository = pullRequest.references.full;

        description = pullRequest.description ?? "";

        sourceBranch = pullRequest.source_branch;

        targetBranch = pullRequest.target_branch;
    }

    let prompt = `
You are a senior software engineer reviewing a pull request.

Repository:
${repository}

Title:
${pullRequest.title}

Description:
${description}

Target Branch:
${targetBranch}

Source Branch:
${sourceBranch}

Your Job is to identify only the important issues that another reviewer would care about.

Do NOT explain the code.
Do NOT summarize the implementation.
Do NOT restate what the PR already says.
Do NOT write long paragraphs.
Do NOT include a conclusion.

Only report findings that are supported by evidence in the code.

For each finding include:
- Severity: Critical | High | Medium | Low
- File
- Issue
- Why it matters
- Suggested fix

If there are no meaningful issues, simply reply:

"No significant issues found."

After listing issues, provide at most 3 positive observations if applicable.

Keep the entire review under 300 words.
`;

    for (const file of files) {

        prompt += `

==================================================

File

${file.path}

Status

${file.status}

PATCH

${file.patch ?? ""}

================================

ORIGINAL SOURCE

${file.original ?? ""}

================================

MODIFIED SOURCE

${file.modified ?? ""}

`;

    }

    return prompt;
}