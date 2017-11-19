#!/bin/sh

# Use like this:
#
# minify-js.sh < app.js > app.min.js
#

curl -s \
  -d compilation_level=SIMPLE_OPTIMIZATIONS \
  -d output_format=text \
  -d output_info=compiled_code \
  -d charset=utf-8 \
 --data-urlencode "js_code@-" \
 https://closure-compiler.appspot.com/compile
