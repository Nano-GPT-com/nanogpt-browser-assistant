#!/bin/bash

# Read version from manifest.json
VERSION=$(grep '"version"' manifest.json | cut -d '"' -f 4)

# Set zip filename using the version
ZIP_FILE="./versions/version-${VERSION}.zip"

# Remove any existing zip file with this version
rm -f "$ZIP_FILE"

# Remove .DS_Store files
find . -name ".DS_Store" -delete

# Create zip file excluding build script and development files
zip -r "$ZIP_FILE" \
    manifest.json \
    background.js \
    sidepanel.html \
    sidepanel.css \
    sidepanel.js \
    popup.js \
    popup.html \
    shared/* \
    content.js \
    overlay.css \
    logo.png \
    icons/* \
    provider-icons/* \
    -x "*.sh" \
    -x ".*" \
    -x "__MACOSX" \
    -x "*.DS_Store"

echo "Extension has been zipped to $ZIP_FILE"

# Optional: Display the contents of the zip file
echo -e "\nZip contents:"
unzip -l "$ZIP_FILE" 
