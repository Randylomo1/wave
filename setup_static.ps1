# Create necessary directories
$directories = @(
    "static\js",
    "static\css",
    "static\main\img",
    "main\templates\main",
    "main\templates\payment"
)

foreach ($dir in $directories) {
    New-Item -ItemType Directory -Force -Path $dir
}

# Move JavaScript files to correct locations
Move-Item -Force "static\js\main.js" "static\js\" -ErrorAction SilentlyContinue
Move-Item -Force "static\js\payment.js" "static\js\" -ErrorAction SilentlyContinue
Move-Item -Force "static\js\service-worker.js" "static\js\" -ErrorAction SilentlyContinue

# Move CSS files
Move-Item -Force "static\css\main.css" "static\css\" -ErrorAction SilentlyContinue

# Move template files
Move-Item -Force "main\templates\main\base.html" "main\templates\main\" -ErrorAction SilentlyContinue
Move-Item -Force "main\templates\payment\payment.html" "main\templates\payment\" -ErrorAction SilentlyContinue
Move-Item -Force "main\templates\main\offline.html" "main\templates\main\" -ErrorAction SilentlyContinue

# Move manifest and other static files
Move-Item -Force "static\main\manifest.json" "static\main\" -ErrorAction SilentlyContinue

Write-Host "Static files setup completed!" 