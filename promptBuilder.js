function buildPrompt(reviewData, reviewFiles, repositoryFiles = []) {
    let repository;
    let description;
    let sourceBranch;
    let targetBranch;
    let author;
    let webUrl;

    if (GIT_PROVIDER === "github") {
        repository = reviewData.base.repo.full_name;
        description = reviewData.body ?? "";
        sourceBranch = reviewData.head.ref;
        targetBranch = reviewData.base.ref;
        author = reviewData.user?.login ?? "";
        webUrl = reviewData.html_url ?? "";
    }
    else {
        repository = reviewData.references?.full ?? reviewData.web_url ?? "";
        description = reviewData.description ?? "";
        sourceBranch = reviewData.source_branch;
        targetBranch = reviewData.target_branch;
        author = reviewData.author?.username ?? reviewData.author?.name ?? "";
        webUrl = reviewData.web_url ?? "";
    }

    const changedFiles = reviewFiles
        .map((file, index) => {
            return `
## File ${index + 1}: ${file.path}

Status:
${file.status}

Patch:
\`\`\`diff
${file.patch ?? ""}
\`\`\`

Original source:
\`\`\`
${file.original ?? ""}
\`\`\`

Modified source:
\`\`\`
${file.modified ?? ""}
\`\`\``;
        })
        .join("\n\n---\n");

    const fullRepository = repositoryFiles.length
        ? repositoryFiles
            .map((file, index) => {
                return `
## Repo File ${index + 1}: ${file.path}

\`\`\`
${file.content ?? ""}
\`\`\``;
            })
            .join("\n\n---\n")
        : "No repository files were collected.";

    return `
# Repository info

Repository:
${repository}

# PR info

Title:
${reviewData.title}

Description:
${description}

Author:
${author}

Source branch:
${sourceBranch}

Target branch:
${targetBranch}

URL:
${webUrl}

# Review instructions

You are a senior engineer reviewing a pull request from the supplied PR metadata, changed files, and full repository files included in this prompt.

Assume you only have access to the files, patches, original source, modified source, and repository files included in this prompt. Do not claim to have inspected any repository files, manifests, lockfiles, callers, callees, tests, architecture, CI configuration, dependency versions, or project-wide conventions that are not included here.

Begin your answer with a one-line verdict.

Immediately follow with a Required Changes section that contains only short bullet points. Keep each bullet to 1-2 lines.

If there are no required changes, explicitly write: No required changes.

Include a Good Things section highlighting 2-5 positive aspects of the change.

After the summary, include a Details section that expands on each required change with these fields:

Severity
Why it matters
Recommendation

Keep paragraphs short, with a maximum of 3 sentences each.

Use headings, bullets, and whitespace to make the review easy to scan.

Avoid walls of text.

Prioritize actionable information over lengthy explanations.

Use these severity levels only:

- Critical: likely to cause data loss, a security vulnerability, a major outage, or completely incorrect behavior.
- High: likely to cause user-visible incorrect behavior, broken integrations, or serious operational risk.
- Medium: a real defect or maintainability issue that should be fixed but is not immediately severe.
- Low: a small correctness, clarity, or maintainability improvement worth addressing.

Do not invent findings. If the supplied code does not provide enough evidence for an issue, either omit it or describe the uncertainty in the finding.

Findings must be grounded in the supplied changed files. Cite the changed file path and line number when possible. If a line number is not available from the supplied patch, cite the file path and describe the relevant code precisely.

# Changed files

${changedFiles}

# Repository files

${fullRepository}
`;
}
