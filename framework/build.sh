#!/bin/bash

node gen_postman_globals.js
jsdoc f5-postman-workflows.js ../README.md -d docs -c jsdoc_conf.json --verbose

