#!/bin/bash

sourceFilePath="src/index.html"
destinationFilePath="./index.html"

# Copy the file
cp -v "$sourceFilePath" "$destinationFilePath"

# Read the file content
fileContent=$(cat "$destinationFilePath")

# Remove occurrences of "../" from the file content
modifiedContent=${fileContent//..\//}

# Save the modified content back to the file
echo "$modifiedContent" > "$destinationFilePath"

echo "Deployed. Press any key to exit..."
read -n 1 -s -r
