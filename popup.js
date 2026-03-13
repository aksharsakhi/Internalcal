/**
 * InternalCalc - Popup Script
 * Sends a message to the content script to toggle the widget on/off.
 */

document.getElementById('toggle-widget-btn').addEventListener('click', function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleWidget' });
            window.close();
        }
    });
});
