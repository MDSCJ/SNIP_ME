# How to Test Services Feature - Complete Step-by-Step Guide

## Phase 1: Prepare Test Data

### Option A: Add Services via Admin Dashboard (Recommended)

1. **Open Admin Dashboard**: Log in as admin
2. **Find Services Section** (check if it exists in admin dashboard)
3. **Create Test Services**:
   - Name: "Haircut" → Submit
   - Name: "Hair Coloring" → Submit
   - Name: "Massage" → Submit
   - Name: "Facial" → Submit

### Option B: Add Services Directly via Database

If admin dashboard doesn't have a service creation UI, run this SQL:

```sql
INSERT INTO services (name, is_active, include_in_search, created_at) VALUES 
('Haircut', 1, 1, NOW()),
('Hair Coloring', 1, 1, NOW()),
('Massage', 1, 1, NOW()),
('Facial', 1, 1, NOW()),
('Hair Treatment', 1, 1, NOW());
```

### Verify Services Exist:
```sql
SELECT id, name, is_active FROM services WHERE is_active = 1;
```

**Should show 5+ rows**

## Phase 2: Clear Browser Cache

This is **CRITICAL** - you must do this for changes to take effect!

### For Chrome/Edge:
1. Press `Ctrl + Shift + Delete`
2. Check: ✓ Cookies and cached images
3. Time range: "All time"
4. Click "Clear data"
5. **Refresh page**: `Ctrl + F5`

### For Firefox:
1. Press `Ctrl + Shift + Delete`
2. Check: ✓ Cache
3. Click "Clear Now"
4. **Refresh page**: `Ctrl + F5`

## Phase 3: Test the Feature

### Step 1: Log in as Salon Owner
1. Open salon owner dashboard
2. Click "Services" in sidebar

### Step 2: Check "Make Services Available" Grid

You should see **orange cards** with service names:
- 🟠 Haircut - *"Tap to add pricing"*
- 🟠 Hair Coloring - *"Tap to add pricing"*
- 🟠 Massage - *"Tap to add pricing"*
- etc.

### If You See: "All services are set up!"

**This means**: No services are available (either none exist, or all are already added)

**Solution**: 
1. Check that services exist in database
2. Verify they have `is_active = 1`
3. Hard refresh browser with `Ctrl + Shift + Delete`

### Step 3: Add a Service

1. Click any service card (e.g., "Haircut")
2. Modal should open with service name and price input
3. Enter price: **500** (or your currency)
4. Click "Add Service"
5. Should see toast: ✅ "Haircut added at 500!"

### Step 4: Verify Service Added

The "Available Services" table should now show:

```
SERVICE NAME  | STATUS    | PRICE
Haircut       | Available | ₨500.00
```

And the "Make Services Available" grid should remove "Haircut" card

## Debugging: Check Browser Console

Press `F12` and go to **Console** tab.

### What You Should See:
```
loadAvailableServicesForPricing: Starting service load for email: owner@salon.com
Available services data: Object { services: Array(5) }
displayAvailableServicesForPricing called with: { servicesCount: 5, salonId: 123 }
[DISPLAY] Rendering 5 available services for pricing
[CARD 1] Created card for: Haircut
[CARD 2] Created card for: Hair Coloring
...
[COMPLETE] Finished rendering all service cards. Total count: 5
```

### If You See Errors:
Share these exact error messages:
- `ERROR: Grid element not found`
- `Failed to fetch services`
- `CORS error`
- Any other red errors

## Debugging: Check Network Requests

In DevTools, go to **Network** tab:

1. Refresh the page
2. Click on "Services" sidebar
3. Look for requests to `/api/salon-owner/services/available`

### Successful Response Should Look Like:
```json
{
  "services": [
    {
      "id": 1,
      "name": "Haircut",
      "isActive": true,
      "salonId": null,
      "createdAt": "2024-04-06T10:00:00"
    },
    {
      "id": 2,
      "name": "Hair Coloring",
      "isActive": true,
      "salonId": null,
      "createdAt": "2024-04-06T10:01:00"
    },
    ...
  ]
}
```

### If Empty Array:
```json
{
  "services": []
}
```

**Means**: No services with `isActive = true` exist in database

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "All services are set up!" message | Create test services in database first |
| Services don't appear after refresh | Clear browser cache: `Ctrl + Shift + Delete` |
| Adding service shows error | Check database has service_prices table |
| API returning 500 error | Check backend is running, look at server logs |
| Grid not showing | Check F12 Console for JavaScript errors |
| Network request returns 404 | Check API_BASE_URL is correct in api-config.js |

## Expected Database State After Testing

```sql
-- Services are created
SELECT id, name, is_active FROM services;
-- Result: 5 rows with is_active = 1

-- Services with pricing for salon_id = 123
SELECT sp.*, si.name FROM service_prices sp
JOIN services si ON sp.service_id = si.id
WHERE sp.salon_id = 123;
-- Result: 1 row (Haircut with price 500)

-- Service grid shows remaining services
-- "Make Services Available": 4 cards shown (Color, Massage, Facial, Treatment)
```

## If Still Not Working

Please share:
1. Database query results: `SELECT * FROM services;`
2. Browser console errors (F12 → Console)
3. Network tab response from `/api/salon-owner/services/available`
4. Screenshot of the Services page

Then I can diagnose the specific issue.
