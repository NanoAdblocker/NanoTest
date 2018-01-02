/**
 * Test controller.
 * https://adblockplus.org/filters
 */
"use strict";

/**
 * Check whether a cosmetic test passed.
 * @function
 */
const checkCosmeticTest = (debug) => {
    const visible = document.querySelectorAll("._nano_test_visible");
    if (visible.length === 0) {
        return false;
    }
    for (let e of visible) {
        let elem = e;
        do {
            if (elem === document.body) {
                break;
            }

            // To be visible, all parents must be also visible
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
    cosmetic_basic: async (override = "cosmetic-basic") => {
        let page = await browser.browser.newPage();
        await page.goto(localhostBase + "tests/" + override);
        await delay(1000);

        try {
            await page.waitForFunction(checkCosmeticTest, {
                timeout: 1000,
            });
            await page.close();
            return true;
        } catch (err) {
            if (/timeout/i.test(err.message)) {
                await page.evaluate(checkCosmeticTest, true);
                return false;
            } else {
                throw err;
            }
        }
    },
    cosmetic_extended: async () => {
        return await tests.cosmetic_basic("cosmetic-extended");
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
        }
    });
};
