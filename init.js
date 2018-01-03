/**
 * Starting point of testing engine.
 * Pretests should already be ran to make sure things
 * are not obviously broken.
 */
"use strict";

/**
 * Load modules onto global scope.
 * @const {Module}
 */
// Built in
global.assert = require("assert");
global.fs = require("fs");
global.path = require("path");
global.util = require("util");
// External
global.express = require("express");
global.puppeteer = require("puppeteer");

/**
 * The base path of the localhost server.
 * @const {string}
 */
global.localhostBase = "http://localhost:1337/";

/**
 * Wait for some time.
 * @async @function
 * @param {number} d - The delay.
 */
global.delay = (d) => {
    return new Promise((r) => { setTimeout(r, d) });
};

/**
 * Static express localhost server.
 * http://expressjs.com/en/api.html
 * @const {ExpressApp}
 */
global.app = (() => {
    let app = express();

    app.use((req, res, next) => {
        console.log("[Server] Request ::", req.url);
        next();
    });

    app.use("/", express.static(
        path.resolve("./server/"),
        {
            etag: false,
            extensions: ["html"],
            fallthrough: false,
            lastModified: false,
        },
    ));

    app.use((err, req, res, next) => {
        if (err.statusCode === 404) {
            console.log("[Server] 404 ::", req.url);
            res.sendStatus(404);
        } else {
            console.log("[Server] 500 ::", err);
            res.sendStatus(500);
        }
    });

    app.listen(1337, "localhost");
    console.log("[Server] Started ::", localhostBase);
    return app;
})();

/**
 * The browser class, represents an instance of Chromium.
 * https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md
 * @class
 */
global.Browser = class {
    /**
     * Initialize properties.
     * @constructor
     * @param {string} extension - The path to the extension to load.
     * @param {string} userdata - The path to the user data directory.
     */
    constructor(extension, userdata) {
        assert(extension && typeof extension === "string");
        assert(userdata && typeof userdata === "string");

        /**
         * The extension to load.
         * @const @prop {string}
         */
        this.extension = path.resolve(extension);
        /**
         * The user data directory.
         * @const @prop {string}
         */
        this.userdata = path.resolve(userdata);

        /**
         * The browser.
         * @prop {PuppeteerBrowser}
         */
        this.browser = null;
    }
    /**
     * Perform cleanup tasks.
     * @private @method
     */
    _cleanup() {
        assert(this.browser !== null);

        this.browser = null;
    }
    /**
     * Setup browser.
     * @async @method
     */
    async setup() {
        assert(this.browser === null);

        this.browser = await puppeteer.launch({
            headless: false,
            args: [
                // https://peter.sh/experiments/chromium-command-line-switches/
                "--disable-extensions-except=" + this.extension,
                "--load-extension=" + this.extension,
            ],
            userDataDir: this.userdata,
            devtools: process.argv.includes("--debug-mode"),
        });

        this.browser.on("disconnected", () => {
            console.log("[Browser] Disconnected");
            this._cleanup();
        });
    }
    /**
     * Close browser.
     * @async @method
     */
    async teardown() {
        assert(this.browser !== null);

        await this.browser.close();
        this._cleanup();
    }
};

// Abort on promise rejection
process.on("unhandledRejection", (err) => {
    throw err;
});

// Bootstrap
(async () => {
    let cleanUp = [];

    // Parse options
    let extension = "../NanoCore/dist/build/Nano_Chromium/";
    let userdata = "./userdata/data/";
    let autoconfig = true;
    for (let arg of process.argv) {
        const extOpt = "--override-extension-path=";
        const userOpt = "--override-user-data-dir=";
        const noacOpt = "--skip-auto-config";

        if (arg.startsWith(extOpt)) {
            extension = arg.substring(extOpt.lenght).trim();
        }

        if (arg.startsWith(userOpt)) {
            extension = arg.substring(userOpt.length).trim();
        }

        if (arg === noacOpt) {
            autoconfig = false;
        }
    }

    // Launch browser
    try {
        await (util.promisify(fs.mkdir))(userdata);
    } catch (err) { }
    global.browser = new Browser(extension, userdata);
    await browser.setup();
    console.log("[Browser] Started");
    if (autoconfig) {
        cleanUp = await (require("./config"))();
    }

    // Open dashboard
    global.dashboard = await browser.browser.newPage();
    await dashboard.goto(localhostBase);
    for (let tab of cleanUp) {
        // Must clean up after opening the dashboard, otherwise Chromium
        // may close with the last tab
        await tab.close();
    }
    cleanUp = null;
    console.log("[Browser] Ready");
    await (require("./test"))();
})();
