/**
 * InternalCalc - Popup Script
 * Handles navigation to the Amrita Student Portal Marks page.
 */

document.getElementById('open-marks-btn').addEventListener('click', function () {
    chrome.tabs.create({ url: 'https://students.amrita.edu/client/marks' });
});
