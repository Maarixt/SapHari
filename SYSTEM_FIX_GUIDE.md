# SapHari Dashboard - Complete System Fix Guide

## Current Issues & Solutions

### 1. JSX Syntax Error in AppShell.tsx
**Problem:** Missing closing div tag at line 369
**Solution:** Add missing closing div before `</header>`

### 2. TypeScript Syntax Error in useMasterAccount.tsx  
**Problem:** Generic function syntax issue
**Solution:** Remove trailing comma from generic type parameters

### 3. Rollup Dependency Issue
**Problem:** Missing `@rollup/rollup-win32-x64-msvc` module
**Solution:** Reinstall dependencies with legacy peer deps

### 4. Backend Server Not Running
**Problem:** No server listening on port 3001
**Solution:** Start the auth server

## Step-by-Step Fix Instructions

### Step 1: Fix Frontend Dependencies
```bash
# Remove corrupted dependencies
Remove-Item -Recurse -Force node_modules, package-lock.json -ErrorAction SilentlyContinue

# Reinstall with legacy peer deps
npm install --legacy-peer-deps
```

### Step 2: Start Backend Server
```bash
# Start the auth server (in one terminal)
node auth-server.cjs
```

### Step 3: Start Frontend
```bash
# Start the frontend (in another terminal)  
npm run dev
```

### Step 4: Test Login
1. Go to `http://localhost:5173/master-login`
2. Use credentials:
   - Email: `omarifrancis846@gmail.com`
   - Password: `dev-master-pass`

## Files Created/Modified

### New Files:
- `auth-server.cjs` - Working backend server
- `SYSTEM_FIX_GUIDE.md` - This guide

### Modified Files:
- `src/hooks/useMasterAccount.tsx` - Fixed TypeScript syntax
- `src/components/layout/AppShell.tsx` - Fixed JSX structure

## Expected Results

After following these steps:
- ✅ Frontend starts without errors
- ✅ Backend server runs on port 3001
- ✅ Master login works with proper credentials
- ✅ Dashboard loads correctly
- ✅ No more 500 errors or JSON parse crashes

## Troubleshooting

If you still get errors:
1. Check that both servers are running (frontend on 5173, backend on 3001)
2. Clear browser cache and cookies
3. Check browser console for any remaining errors
4. Verify the auth server is showing "🚀 Auth Server running on port 3001"

## Next Steps

Once the system is working:
1. Test the complete login flow
2. Verify dashboard functionality
3. Test device management features
4. Check alert system integration



