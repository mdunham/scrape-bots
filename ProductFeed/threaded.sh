#!/bin/bash

for((i=0;i<$1;i+=1)); do casperjs --ignore-ssl-errors=true product-feeds.js $i $1 >> log.log & done
