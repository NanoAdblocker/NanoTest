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
    console.log("[Server] Started :: http://localhost:1337/");
    return app;
})();

/**
 * The browser class, represents an instance of Chromium.
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
        /**
         * Tab store.
         * @prop {Array.<Tab>}
         */
        this.tabs = [];
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
        });
    }
    /**
     * Close browser.
     * @async @method
     */
    async teardown() {
        assert(this.browser !== null);

        await this.browser.close();
        this.browser = null;
        this.tabs = [];
    }
};

// Main test function
(async () => {
    // Parse options
    let extension = "../NanoCore/dist/build/Nano_Chromium/";
    let userdata = "./userdata/data/";
    for (let arg in process.argv) {
        const extOpt = "--override-extension-path=";
        const extUser = "--override-user-data-dir=";

        if (arg.startsWith(extOpt)) {
            extension = arg.substring(extOpt.lenght).trim();
        }

        if (arg.startsWith(extUser)) {
            extension = arg.substring(extUser.length).trim();
        }
    }

    // Launch browser
    try {
        await (util.promisify(fs.mkdir))(userdata);
    } catch (err) { }
    let browser = new Browser(extension, userdata);
    await browser.setup();

})();
