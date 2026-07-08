chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.sendMessage(
        tab.id,
        { action: "toggle-panel" },
        () => {
            if (chrome.runtime.lastError) {
                console.log(chrome.runtime.lastError.message);
            }
        }
    );
});