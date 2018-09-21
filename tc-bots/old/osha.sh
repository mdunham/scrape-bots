#!/bin/bash

killall casperjs;
/usr/local/bin/casperjs --ignore-ssl-errors=true /Users/mdunham/Projects/scrape-bots/tc-bots/old/main.js
