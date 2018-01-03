# Nano Test Engine [![Dependencies](https://david-dm.org/NanoAdblocker/NanoTest.svg)](https://david-dm.org/NanoAdblocker/NanoTest)

But does it even work?

The automated testing framework for Nano Adblocker, requires latest current branch of [Node.js](https://nodejs.org/en/). 

### One time setup

```Bash
npm install
```

### Start

```Bash
node init
```

### Advanced

```
--debug-mode
Open the developer tool for every window
Defaults to only open developer tool for the extension background page
A debugger breakpoint will be triggered on failed test, this option can be useful to trace down failed tests

--override-extension-path=<path>
Change the path to the extension to load
Defaults to "../NanoCore/dist/build/Nano_Chromium/"

--override-user-data-dir=<path>
Change the path to the user data directory
Defaults to "./userdata/data/"

--skip-auto-config
Skip automated configuration which does the following:
- Enter "chrome://extensions/"
- Enable "Developer mode"
- Select "Allow in incognito"
- Select "Collect errors"
- Unselect "Allow access to file URLs"
- Enter the extension dashboard
- Unselect all filters
- Load test filter
- Update the test filter
- Close "chrome://extensions/" and the extension dashboard
```
