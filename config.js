/**
 * Automated configuration.
 */
"use strict";

/**
 * Perform automated configuration.
 * @async @function
 */
module.exports = async () => {
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
    let toClose = [];

    // Open background page console
    await tab.goto("chrome://extensions/");
    toClose.push(tab);
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

                    window._nano_test_openbgconsole_done = true;
                    break;
                }
            }
        };

        performExtConfig();
    }, extid);
    await tab.waitForFunction("window._nano_test_openbgconsole_done === true");
    await delay(2000);

    // Update test filter
    tab = await browser.browser.newPage();
    await tab.goto("chrome-extension://" + extid + "/dashboard.html");
    toClose.push(tab);
    tab.evaluate((localhostBase) => {
        const testFilter = localhostBase + "filter.txt";
        const tab3p = document.querySelector("#dashboard-nav-widgets a[data-i18n='3pPageName']");
        console.assert(tab3p instanceof HTMLAnchorElement);
        tab3p.click();

        const onIframeReady = () => {
            const iframe = document.querySelector("iframe");
            console.assert(iframe instanceof HTMLIFrameElement);
            const win = iframe.contentWindow;
            const doc = iframe.contentDocument;

            // Disable auto update
            const autoUpdate = doc.querySelector("#options #autoUpdate");
            console.assert(autoUpdate instanceof win.HTMLInputElement);
            if (autoUpdate.checked) {
                autoUpdate.click();
            }

            // Disable unrelated filters
            const filters = doc.querySelectorAll(".listEntry input");
            console.assert(filters.length > 50);
            for (let filter of filters) {
                if (filter.checked && filter.nextElementSibling.textContent.trim() !== testFilter) {
                    filter.click();
                }
                if (filter.nextElementSibling.textContent.trim() === testFilter) {
                    if (!filter.checked) {
                        filter.click();
                    }
                    const cache = filter.parentElement.querySelector(".status.cache");
                    console.assert(cache instanceof win.HTMLSpanElement);
                    if (win.getComputedStyle(cache).display !== "none") {
                        cache.click();
                    }
                }
            }

            // Load test filter
            const extraFilters = doc.getElementById("externalLists");
            console.assert(extraFilters instanceof win.HTMLTextAreaElement);
            extraFilters.value = testFilter;
            const inputEvent = new win.Event("input", {
                "bubbles": true,
                "cancelable": true,
            });
            extraFilters.dispatchEvent(inputEvent);

            // Apply and update
            requestAnimationFrame(() => {
                const apply = doc.getElementById("buttonApply");
                console.assert(apply instanceof win.HTMLButtonElement);
                if (!apply.classList.contains("disabled")) {
                    apply.click();
                }

                const update = doc.getElementById("buttonUpdate");
                console.assert(apply instanceof win.HTMLButtonElement);
                if (!update.classList.contains("disabled")) {
                    update.click();
                }

                window._nano_test_extconfig_done = true;
            });
        };

        const checkIframeReady = () => {
            const iframe = document.querySelector("iframe");
            console.assert(iframe instanceof HTMLIFrameElement);
            const lists = iframe.contentDocument.querySelectorAll(".listEntry");
            if (lists.length > 50) {
                onIframeReady();
            } else {
                setTimeout(checkIframeReady, 100);
            }
        };
        checkIframeReady();
    }, localhostBase);
    await tab.waitForFunction("window._nano_test_extconfig_done === true;");
    await delay(2000);

    // Mark opened tabs as need to be cleaned up
    return toClose;
};
