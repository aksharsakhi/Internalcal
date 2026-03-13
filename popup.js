/**
 * InternalCalc - Popup Script
 * Handles navigation to the Amrita Student Portal Marks page.
 */

document.addEventListener('DOMContentLoaded', () => {
    const openMarksBtn = document.getElementById('open-marks-btn');

    if (openMarksBtn) {
        openMarksBtn.addEventListener('click', () => {
            const marksUrl = 'https://students.amrita.edu/client/marks';

            // First try to find an existing Amrita tab and navigate it
            chrome.tabs.query({}, (tabs) => {
                const amritaTab = tabs.find(t => t.url && t.url.includes('students.amrita.edu'));
                if (amritaTab) {
                    // Navigate the existing Amrita tab to the marks page
                    chrome.tabs.update(amritaTab.id, { url: marksUrl, active: true });
                    // Focus the window containing that tab
                    chrome.windows.update(amritaTab.windowId, { focused: true });
                } else {
                    // Open a new tab
                    chrome.tabs.create({ url: marksUrl });
                }
                // Close the popup
                window.close();
            });
        });
    }
});
