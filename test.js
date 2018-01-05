/**
 * Test controller.
 * https://adblockplus.org/filters
 */
"use strict";

/**
 * Check whether a test passed.
 * @function
 */
const checkTest = (debug) => {
    const visible = document.querySelectorAll("._nano_test_visible");
    if (visible.length === 0) {
        if (debug) {
            debugger;
        }
        return false;
    }
    for (let e of visible) {
        let elem = e;
        do {
            if (elem === document.body) {
                break;
            }

            // To be visible, itself and all parents must be visible
            const display = getComputedStyle(elem).display;
            if (display !== "block" && display !== "inline" && display !== "inline-block") {
                if (debug) {
                    debugger;
                }
                return false;
            }
        } while (elem = elem.parentElement);
    }

    const hide = document.querySelectorAll("._nano_test_hide");
    if (hide.length === 0) {
        if (debug) {
            debugger;
        }
        return false;
    }
    for (let e of hide) {
        let isHidden = false;
        let elem = e;

        do {
            if (elem === document.body) {
                break;
            }

            // To be hidden, itself or one of parent must be hidden
            const display = getComputedStyle(elem).display;
            if (display === "none") {
                isHidden = true;
                break;
            }
        } while (elem = elem.parentElement);

        if (!isHidden) {
            if (debug) {
                debugger;
            }
            return false;
        }
    }

    return true;
};

/**
 * Available tests.
 * @const {Object.<Function>}
 */
const tests = {
    extended_basic: async (override = "extended-basic") => {
        let page = await browser.browser.newPage();
        await page.goto(localhostBase + "tests/" + override);
        await delay(1000);

        try {
            await page.waitForFunction(checkTest, {
                timeout: 1500,
            });
            await page.close();
            return true;
        } catch (err) {
            if (/timeout/i.test(err.message)) {
                await page.evaluate(checkTest, true);
                return false;
            } else {
                throw err;
            }
        }
    },
    extended_extended: async () => {
        return await tests.extended_basic("extended-extended");
    },
    extended_other: async () => {
        return await tests.extended_basic("extended-other");
    },

    // Some network filter tests use DOM flag elements to enable code reuse
    network_basic: async () => {
        return await tests.extended_basic("network-basic");
    },
};

/**
 * Establish connection with dashboard.
 * @async @function
 */
module.exports = async () => {
    await dashboard.exposeFunction("nano_test_engine", async (test_name) => {
        if (tests.hasOwnProperty(test_name)) {
            return await tests[test_name]();
        } else {
            console.error("[Tests] Not Found ::", test_name);
            return false;
        }
    });
};
