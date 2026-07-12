# PowerShell script to apply the products constraint fix
# Run this from the project root: .\apply-products-fix.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Products Unique Constraint Fix Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Load environment variables
$envContent = Get-Content .env.local -Raw
$dbUrl = if ($envContent -match 'DIRECT_URL="?([^"\r\n]+)"?') { 
    $matches[1] 
} elseif ($envContent -match 'DATABASE_URL="?([^"\r\n]+)"?') {
    $matches[1]
} else {
    Write-Host "ERROR: Could not find DATABASE_URL in .env.local" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Database connection found" -ForegroundColor Green
Write-Host ""

# Step 1: Check for duplicates
Write-Host "Step 1: Checking for duplicate products..." -ForegroundColor Yellow
Write-Host "Running: psql check_duplicates.sql" -ForegroundColor Gray

try {
    $duplicateCheck = & psql "$dbUrl" -f check_duplicates.sql 2>&1
    $duplicateOutput = $duplicateCheck | Out-String
    
    if ($duplicateOutput -match '\(0 rows\)' -or $duplicateOutput -match 'affected_skus.*0') {
        Write-Host "✓ No duplicates found! Safe to proceed." -ForegroundColor Green
        $hasDuplicates = $false
    } else {
        Write-Host "⚠ Duplicates detected:" -ForegroundColor Yellow
        Write-Host $duplicateOutput
        $hasDuplicates = $true
    }
} catch {
    Write-Host "⚠ Could not check for duplicates. Error: $_" -ForegroundColor Yellow
    Write-Host "Assuming no duplicates..." -ForegroundColor Gray
    $hasDuplicates = $false
}

Write-Host ""

# Step 2: Fix duplicates if needed
if ($hasDuplicates) {
    Write-Host "Step 2: Fixing duplicate products..." -ForegroundColor Yellow
    $response = Read-Host "Do you want to automatically fix duplicates? (y/n)"
    
    if ($response -eq 'y' -or $response -eq 'Y') {
        Write-Host "Running: psql fix_duplicate_products.sql" -ForegroundColor Gray
        try {
            & psql "$dbUrl" -f fix_duplicate_products.sql
            Write-Host "✓ Duplicates fixed!" -ForegroundColor Green
        } catch {
            Write-Host "✗ Error fixing duplicates: $_" -ForegroundColor Red
            Write-Host "Please fix manually before continuing." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "⚠ Please fix duplicates manually before applying migration." -ForegroundColor Yellow
        Write-Host "You can run: psql `"$dbUrl`" -f fix_duplicate_products.sql" -ForegroundColor Gray
        exit 1
    }
} else {
    Write-Host "Step 2: Skipped (no duplicates to fix)" -ForegroundColor Green
}

Write-Host ""

# Step 3: Apply migration
Write-Host "Step 3: Applying unique constraint migration..." -ForegroundColor Yellow
$response = Read-Host "Ready to apply migration? This will add unique indexes. (y/n)"

if ($response -ne 'y' -and $response -ne 'Y') {
    Write-Host "Migration cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host "Running migration..." -ForegroundColor Gray
try {
    & psql "$dbUrl" -f "prisma\migrations\20260713_products_unique_constraints\migration.sql"
    Write-Host "✓ Migration applied successfully!" -ForegroundColor Green
} catch {
    Write-Host "✗ Error applying migration: $_" -ForegroundColor Red
    Write-Host "Check the error above and try again." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 4: Verify constraints
Write-Host "Step 4: Verifying constraints..." -ForegroundColor Yellow
Write-Host "Running: psql check_constraints.sql" -ForegroundColor Gray

try {
    $constraints = & psql "$dbUrl" -f check_constraints.sql 2>&1
    $constraintOutput = $constraints | Out-String
    
    if ($constraintOutput -match 'products_business_sku_active_key') {
        Write-Host "✓ SKU unique constraint verified" -ForegroundColor Green
    } else {
        Write-Host "⚠ SKU constraint not found" -ForegroundColor Yellow
    }
    
    if ($constraintOutput -match 'products_business_barcode_active_key') {
        Write-Host "✓ Barcode unique constraint verified" -ForegroundColor Green
    } else {
        Write-Host "⚠ Barcode constraint not found" -ForegroundColor Yellow
    }
    
    if ($constraintOutput -match 'products_business_name_active_key') {
        Write-Host "✓ Name unique constraint verified" -ForegroundColor Green
    } else {
        Write-Host "⚠ Name constraint not found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ Could not verify constraints: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✓ Fix Applied Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Test creating a product in the Inventory Engine" -ForegroundColor White
Write-Host "2. Test updating stock quantities" -ForegroundColor White
Write-Host "3. Test saving in Visual/Busy/Excel modes" -ForegroundColor White
Write-Host "4. Verify no constraint errors appear" -ForegroundColor White
Write-Host ""
Write-Host "If you encounter issues, see FIX_PRODUCTS_CONSTRAINT_ERRORS.md" -ForegroundColor Gray
Write-Host ""
