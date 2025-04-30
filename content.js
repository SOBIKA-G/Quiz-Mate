chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "extractText") {
      let text = document.body.innerText;
      chrome.storage.local.set({ extractedText: text }, () => {
        chrome.runtime.sendMessage({ action: "showNotification" });
      });
      sendResponse({ success: true });
    }
  });