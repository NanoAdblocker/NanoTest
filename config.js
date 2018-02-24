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
    let existingTargets = browser.browser.targets();
    for (let target of existingTargets) {
        switch (target.type()) {
            case "other":
                const match = /^chrome-extension:\/\/([^/]+)\//.exec(target.url());
                if (match) {
                    if (bgpage !== undefined && extid !== undefined) {
                        // Sometimes Chromium will load two copies of the extension when
                        // starting for the first time
                        console.error("[Config] Error :: Try Restarting");
                        while (true) {
                            await delay(10000);
                        }
                    }

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
    }
    assert(bgpage !== undefined && typeof extid === "string");
    tab = await tab;
    let toClose = [];

    // Open background page console
    await tab.goto("chrome://extensions/");
    toClose.push(tab);
    tab.evaluate((extid) => {
        // This will blow up again if Chromium extensions page is changed again
        const performExtConfig = () => {
            let extension = document
                .querySelector("extensions-manager").shadowRoot
                .querySelector("extensions-item-list.active");
            if (!extension) {
                setTimeout(performExtConfig, 100);
                return;
            }
            extension = extension.shadowRoot.querySelector("extensions-item#" + extid);
            if (!extension) {
                setTimeout(performExtConfig, 100);
                return;
            }
            extension = extension.shadowRoot;

            const inspectViews = extension.querySelectorAll("#inspect-views a");
            for (let view of inspectViews) {
                if (view.innerHTML.trim() === "background.html") { // Could have WebRTC detection iframe
                    view.click();
                    break;
                }
            }

            const detailsButton = extension.getElementById("details-button");
            detailsButton.click();

            const performExtDeepConfig = () => {
                let optionsSection = document
                    .querySelector("extensions-manager").shadowRoot
                    .querySelector("extensions-detail-view.active");
                if (!optionsSection) {
                    setTimeout(performExtDeepConfig, 100);
                    return;
                }
                optionsSection = optionsSection.shadowRoot.getElementById("options-section");
                if (!optionsSection) {
                    setTimeout(performExtDeepConfig, 100);
                    return;
                }

                const setOneToggle = (name, value) => {
                    const button = optionsSection
                        .querySelector(name).shadowRoot
                        .querySelector("cr-toggle");
                    if (button.checked !== value) {
                        button.click();
                    }
                };

                setOneToggle("#allow-incognito", true);
                setOneToggle("#collect-errors", true);
                setOneToggle("#allow-on-file-urls", false);
            };


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


            window._nano_test_openbgconsole_done = true;
        };

        const devToggle = document
            .querySelector("extensions-manager").shadowRoot
            .querySelector("extensions-toolbar").shadowRoot
            .querySelector("cr-toolbar #dev-mode");
        console.assert(devToggle !== null);
        if (!devToggle.checked) {
            devToggle.click();
        }
        requestAnimationFrame(performExtConfig);
    }, extid);
    try {
        await tab.waitForFunction("window._nano_test_openbgconsole_done === true", {
            timeout: 10000,
        });
    } catch (err) {
        if (/timeout/i.test(err.message)) {
            // Try again
            return await module.exports();
        } else {
            throw err;
        }
    }
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
