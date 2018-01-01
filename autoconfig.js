/**
 * Perform automated configuration of Nano Adblocker
 * then get the browser ready for tests.
 */
"use strict";

/**
 * Perform automated configuration of Nano Adblocker.
 * @async @function
 * @param {Browser} browser - The opened browser.
 */
module.exports = async (browser) => {
    // Find pages
    let bgpage, extid;
    let tab;
    browser.browser.targets().forEach((target) => {
        switch (target.type()) {
            case "other":
                const match = /^chrome-extension:\/\/([^/]+)\//.exec(target.url());
                if (match) {
                    bgpage = target;
                    extid = match[1];
                }
                break;
            case "page":
                tab = target.page();
                break;
            default:
                break;
        }
    });
    tab = await tab;

    
};
