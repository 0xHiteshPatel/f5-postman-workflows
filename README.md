## Introduction

**This is a community based project.  As such F5 Networks does not provide any
offical support for this project**

- Github: https://github.com/0xHiteshPatel/f5-postman-workflows/
- Language: JavaScript
- License: Apache

This framework is intended to be used with [Postman](https://getpostman.com).
The purpose of this framework is to implement common functions
that simplify building [Collections](https://www.getpostman.com/docs/collections)
that implement complex workflows.  The framework provides the base functions
to help with:

 - Population of [Environment](https://www.getpostman.com/docs/environments) variables
 - [Testing](https://www.getpostman.com/docs/writing_tests) of response data
 - Implementation of a time-delay based polling mechanism

Workflows implemented with this framework can be run via:

 - [Postman](https://www.getpostman.com/docs/requests)
 - [Postman Collection Runner](https://www.getpostman.com/docs/running_collections)
 - [Newman CLI](https://www.getpostman.com/docs/newman_intro)

## Installation

To install the framework:

 1. Open Postman
 2. Click the 'Import' button
 3. Select 'Import from Link'
 4. Enter ```https://raw.githubusercontent.com/0xHiteshPatel/f5-postman-workflows/master/F5_Postman_Workflows.postman_collection.json``` in the field
 5. Click the 'Import' button
 6. Navigate to your Postman [Collections](https://www.getpostman.com/docs/collections)
 7. Expand the 'F5_Postman_Workflows' collection
 8. Expand the 'Install' folder
 9. Click the 'Install/Upgrade f5-postman-workflows' items
 10. Click the 'Send' button
 11. Verify the installation was successful by:
     1. Examine the response tests and ensure the 'Install Successful' test passed
     2. Examine your Postman Global Environment and look for a _f5_workflow_functions item populated with JavaScript code

## Usage

Please see the items in 'Examples' and 'Tests' folders of the collection
installed above for detailed examples of how to use the framework.

The following global environment variables can be used for configuration:

| Name                    | Type    | Description |
|-------------------------|---------|-------------|
| _f5_debug               | Boolean | Enable/disable debug output. |
| _f5_enabled_polled_mode | Boolean | Enable/disable polled mode.  Will mark all tests as successful.  Pass/fail is state is shown in test name text. |
| _f5_poll_max_tries      | Number  | Max number of polls. |
| _f5_poll_wait           | Number  | Time in seconds to wait between polls. |
| _f5_poll_useinternal    | Boolean | Use the internal while() loop to sleep **WARNING: this will block the thread** |
| _f5_poll_apiurl         | String  | The URL for an API endpoint that implements a delay. |
| _f5_poll_bypass_timeout | Boolean | Don't exit if a max_tries is reached
| _f5_framework_branch    | String  | The Github branch to use during install.  Default is 'master'.


## Developers

### Build

To help load and test changes locally a node script is included to auto-generate
an importable global environment file to Postman:
```
$ git clone https://github.com/0xHiteshPatel/f5-postman-workflows.git
$ cd framework
$ npm install
$ npm run build
```

### Docs

Additionally docs are generated using ``jsdoc`` with the command:
```
$ cd framework
$ npm install
$ npm run doc
```

### Tests

The F5_Postman_Workflows collection includes a test framework under the 'Tests'
folder.  Tests should be run manually, with Collection Runner and Newman before
submitted a pull request.  Test output should be included with any pull requests.

To run the test framework with newman perform the following:
```
$ cd framework
$ npm test
```

