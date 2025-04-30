chrome.runtime.onInstalled.addListener(() => {
    console.log("AI Quiz Generator Extension Installed");
});
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//     if (message.action === "showNotification") {
//       chrome.notifications.create({
//         type: "basic",
//         iconUrl: "images/cat16.png",
//         title: "Content Extracted",
//         message: "The content has been successfully extracted and stored!"
//       });
//     }
//   });

  