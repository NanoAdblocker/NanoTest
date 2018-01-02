/**
 * Test controller.
 * https://adblockplus.org/filters
 */
"use strict";

/**
 * Check whether a cosmetic test passed.
 * @function
 */
const checkCosmeticTest = () => {
    const visible = document.querySelectorAll("._nano_test_visible");
    if (visible.length === 0) {
        return false;
    }
    for (let e of visible) {
        if (getComputedStyle(e).display !== "block") {
            return false;
        }
    }

    const hide = document.querySelectorAll("._nano_test_hide");
    if (hide.length === 0) {
        return false;
    }
    for (let e of hide) {
        if (getComputedStyle(e).display !== "none") {
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
    cosmetic_basic: async () => {
        let page = await browser.browser.newPage();
        await page.goto(localhostBase + "tests/cosmetic-basic");
        await delay(1000);

        try {
            await page.waitForFunction(checkCosmeticTest, {
                timeout: 1000,
            });
            await page.close();
            return true;
        } catch (err) {
            if (/timeout/i.test(err.message)) {
                return false;
            } else {
                throw err;
            }
        }
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
