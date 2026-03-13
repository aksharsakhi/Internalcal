/**
 * InternalCalc - Popup Script
 * Handles custom navigation to the Amrita Student Portal Marks page.
 */

document.addEventListener('DOMContentLoaded', () => {
    const openMarksBtn = document.getElementById('open-marks-btn');

    if (openMarksBtn) {
        openMarksBtn.addEventListener('click', () => {
            const marksUrl = 'https://students.amrita.edu/client/marks';

            // Use Chrome API for reliable navigation in extension context
            if (typeof chrome !== 'undefined' && chrome.tabs) {
                chrome.tabs.create({ url: marksUrl });
            } else {
                // Fallback for non-extension environments (testing)
                window.open(marksUrl, '_blank');
            }
        });
    }
});
