# Quick Migration Setup (Windows)

## Fix the 3 Issues from Pre-Migration Check

### Issue 1: DATABASE_URL Not Set

**Option A - PowerShell (Current Session Only):**
```powershell
$env:DATABASE_URL="postgresql://your_username:your_password@your_host:5432/your_database"
```

**Option B - PowerShell (Permanent):**
```powershell
[Environment]::SetEnvironmentVariable("DATABASE_URL", "postgresql://your_username:your_password@your_host:5432/your_database", "User")
```

**Option C - Using .env file:**
Create/edit `.env` in the repository root:
```
DATABASE_URL=postgresql://your_username:your_password@your_host:5432/your_database
```

**Where to get your connection string:**
- Supabase: Project Settings → Database → Connection String
- Local PostgreSQL: `postgresql://postgres:password@localhost:5432/tenvo`
- AWS RDS: Check your RDS dashboard

---

### Issue 2: PostgreSQL Client Not Required! ✅

**Good news:** You don't need to install PostgreSQL!

Use the **Node.js-only migration script** (no psql required):
```powershell
cd <path-to-repo>
node scripts\migrate-using-node.js
```

This script uses the `pg` library (already installed in your project) to connect directly.

---

### Issue 3: Migration File Exists ✅

The migration file exists at `scripts\migrations\002_add_admin_features.sql` - the check script just had a Windows compatibility issue.

---

## 🚀 Quick Start (3 Commands)

### Step 1: Set DATABASE_URL
```powershell
$env:DATABASE_URL="your_connection_string_here"
```

### Step 2: Run Migration (Node.js - No psql needed!)
```powershell
node scripts\migrate-using-node.js
```

### Step 3: Build & Test
```powershell
bun run build
bun run dev
```

---

## 🆘 If You Still Have Issues

### Problem: "Cannot find module 'pg'"
```powershell
npm install pg
```

### Problem: Connection refused
1. Check if database server is running
2. Verify connection string format
3. Check firewall settings

### Problem: Permission denied
Your database user needs CREATE TABLE permissions:
```sql
GRANT ALL ON SCHEMA public TO your_username;
```

---

## 📋 Alternative: Full Windows Setup Script

Run this PowerShell script (as Administrator) to set everything up:

```powershell
cd <path-to-repo>
powershell -ExecutionPolicy Bypass -File scripts\setup-windows-env.ps1
```

---

## ✅ Expected Success Output

```
============================================================
NODE.JS DATABASE MIGRATION
============================================================

[1/6] Testing database connection...
✅ Connected to: PostgreSQL

[2/6] Reading migration file...
✅ Migration file loaded

[3/6] Creating backup...
✅ Backup reference saved

[4/6] Executing migration...
✅ Created table: feature_flags
✅ Created table: feature_flag_overrides
✅ Created table: custom_roles
✅ Created table: user_activity_logs
✅ Created table: impersonation_sessions
✅ Created table: user_invitations
✅ Created table: custom_packages

[5/6] Verifying migration...
✅ feature_flags: 5 records
✅ feature_flag_overrides: 0 records
...

============================================================
✅ MIGRATION SUCCESSFUL
============================================================
```

---

**Ready?** Just run:
```powershell
$env:DATABASE_URL="your_connection_string"
node scripts\migrate-using-node.js
```

Replace `your_connection_string` with your actual PostgreSQL connection string!
