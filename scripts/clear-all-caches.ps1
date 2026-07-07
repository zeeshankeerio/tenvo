# Clear All Caches Script
# Clears Redis, Next.js, and prepares for fresh start

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   Clearing All Caches" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════`n" -ForegroundColor Cyan

# Step 1: Clear Redis
Write-Host "🔧 Step 1: Clearing Redis cache..." -ForegroundColor Yellow
try {
    $redisResult = redis-cli FLUSHDB 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Redis cache cleared successfully`n" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Redis-cli not found or Redis not running" -ForegroundColor Yellow
        Write-Host "   Skipping Redis cache clear (optional)`n" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Could not clear Redis cache: $_" -ForegroundColor Yellow
    Write-Host "   Continuing anyway...`n" -ForegroundColor Yellow
}

# Step 2: Clear Next.js cache
Write-Host "🔧 Step 2: Clearing Next.js cache..." -ForegroundColor Yellow
if (Test-Path ".next") {
    try {
        Remove-Item -Recurse -Force ".next"
        Write-Host "✅ Next.js .next folder deleted`n" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to delete .next folder: $_" -ForegroundColor Red
        Write-Host "   You may need to stop the dev server first`n" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "ℹ️  .next folder not found (already clean)`n" -ForegroundColor Cyan
}

# Step 3: Clear node_modules/.cache if exists
Write-Host "🔧 Step 3: Clearing node_modules cache..." -ForegroundColor Yellow
if (Test-Path "node_modules\.cache") {
    try {
        Remove-Item -Recurse -Force "node_modules\.cache"
        Write-Host "✅ Node modules cache cleared`n" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Could not clear node_modules cache: $_" -ForegroundColor Yellow
        Write-Host "   Continuing anyway...`n" -ForegroundColor Yellow
    }
} else {
    Write-Host "ℹ️  No node_modules cache found`n" -ForegroundColor Cyan
}

# Step 4: Summary
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   ✅ Cache Clear Complete!" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "📋 Next Steps:`n" -ForegroundColor White
Write-Host "1. Rebuild the application:" -ForegroundColor White
Write-Host "   npm run build`n" -ForegroundColor Gray

Write-Host "2. Start the dev server:" -ForegroundColor White
Write-Host "   npm run dev`n" -ForegroundColor Gray

Write-Host "3. Test demo stores:" -ForegroundColor White
Write-Host "   http://localhost:3000/store/demo-boutique`n" -ForegroundColor Gray

Write-Host "4. Check console logs for:" -ForegroundColor White
Write-Host "   [reviews route] Business resolved: ✅" -ForegroundColor Green
Write-Host "   [stock route] Business resolved: ✅`n" -ForegroundColor Green

Write-Host "🎯 If you see '❌ null' in logs, see DEMO_STORE_404_COMPLETE_FIX.md" -ForegroundColor Yellow
