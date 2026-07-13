const GITLAB_OAUTH = {
    "gitlab.com" : {
        clientId: "f5855d00c0aecd21ebe6bc14f4ff9357a055851aa18b3ba105bd5caf8e0feb44"
    },
    "git.routematic.com": {
        clientId: "ROUTEMATIC_CLIENT_ID"
    }
};

async function gitlabLogin() {
    const host = window.location.hostname;

    const config = GITLAB_OAUTH[host];

    if (!config) {
        throw new Error(
            "Oauth is not supported for this Gitlab instance."
        );
    }

    const redirectUrl = chrome.identity.getRedirectURL();

    const authUrl =
        `https://${host}/oauth/authorize`
        + `?client_id=${encodeURIComponent(config.clientId)}`
        + `&redirect_uri=${encodeURIComponent(redirectUri)}`
        + `&response_type=code`
        + `&scope=api`;

    const responseUrl = await chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true
    });

    if (!responseUrl) {
        return;
    }

    const code = new URL(responseUrl).searchParams.get("code");

    if (!code) {
        throw new Error("oAuth failed.");
    }

    // exchange authorization code for access token
    const tokenResponse = await fetch(
        `https://${host}/oauth/token`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },

            body: new URLSearchParams({
                client_id: config.clientId,
                code: code,
                grant_type: "authorization_code",
                redirect_uri: redirectUrl
            })
        }
    );

    if (!tokenResponse.ok) {
        throw new Error(await tokenResponse.text());
    }

    const token = await tokenResponse.json();

    // Get current user
    const userResponse = await fetch(
        `https://${host}/api/v4/user`,
        {
            headers: {
                Authorization: `Bearer ${token.access_token}`
            }
        }
    );

    if (!userResponse.ok) {
        throw new Error(await userResponse.text());
    }

    const user = await userResponse.json();

    await saveGitlabSession({
        host: `https://${host}`,
        accessToken: token.access_token,
        username: user.username
    });

    updateAccountUI();
}

async function gitlabLogout() {
    await clearGitlabSession();
    updateAccountUI();
}