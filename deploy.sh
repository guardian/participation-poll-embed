#!/usr/bin/env bash

npm install
mkdir -p build/bower_components/pasteup-forms/build
mkdir -p build/css
cp index.html bundle.js build/
cp css/style.css build/css/style.css
cp bower_components/pasteup-forms/build/forms.min.css build/bower_components/pasteup-forms/build/
aws s3 sync build/ s3://gdn-cdn/participation/poll/embed --acl public-read --profile interactivesProd
rm -rf build/

