$sourceFilePath = "src/index.html"
$destinationFilePath = ".\index.html"

# Copy the file
Copy-Item -Path $sourceFilePath -Destination $destinationFilePath -Force -Verbose

# Read the file content
$fileContent = Get-Content $destinationFilePath -Raw -Verbose

# Remove occurrences of "../" from the file content
$modifiedContent = $fileContent -replace "\.\./", ""

# Save the modified content back to the file
$modifiedContent | Set-Content $destinationFilePath -Force -Verbose

Write-Host "Empty folders deleted. Press any key to exit..."
$host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") | Out-Null

