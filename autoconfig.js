/**
 * Perform automated configuration of Nano Adblocker
 * then get the browser ready for tests.
 */
"use strict";

/**
 * Wait for some time.
 * @async @function
 * @param {number} d - The delay.
 */
const delay = (d) => {
    return new Promise((resolve) => { setTimeout(resolve, d) });
};

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
                    assert(bgpage === undefined && extid === undefined);

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

    // Open background page console
    await tab.goto("chrome://extensions/");
    tab.evaluate((extid) => {
        // This will blow up if Chromium extensions page is changed
        const devToggle = document.querySelector("#dev-toggle input[type='checkbox']");
        console.assert(devToggle instanceof HTMLInputElement);
        if (!devToggle.checked) {
            devToggle.click();
        }

        const performExtConfig = () => {
            const loading = document.getElementById("loading-spinner");
            console.assert(loading instanceof HTMLDivElement);
            if (loading.getAttribute("hidden") === null) {
                setTimeout(performExtConfig, 100);
                return;
            }

            const extensions = document.querySelectorAll(".extension-list-item");
            for (let extension of extensions) {
                console.assert(extension instanceof HTMLDivElement);
                const id = extension.querySelector(".developer-extras .extension-id");
                console.assert(id instanceof HTMLSpanElement);
                if (id.textContent.trim() === extid) {
                    const controls = extension.querySelectorAll(".optional-controls input[type='checkbox']");
                    console.assert(controls.length === 4);
                    for (let control of controls) {
                        switch (control.getAttribute("focus-type")) {
                            case "incognito":
                            case "collectErrors":
                                if (!control.checked) {
                                    control.click();
                                }
                                break;
                            case "localUrls":
                                if (control.checked) {
                                    control.click();
                                }
                                break;
                            default:
                                break;
                        }
                    }
                    const pages = extension.querySelectorAll(".active-views a");
                    console.assert(pages.length >= 1); // Could have the WebRTC test iframe
                    for (let page of pages) {
                        if (page.textContent.trim() === "background.html") {
                            page.click();
                        }
                    }

                    window._nano_test_autoconfig_done = true;
                    break;
                }
            }
        };

        performExtConfig();
    }, extid);
    await tab.waitForFunction("window._nano_test_autoconfig_done === true");
    await delay(1000);

    // Update extension settings
    tab = await browser.browser.newPage();
    await tab.goto("chrome-extension://" + extid + "/dashboard.html");
};
