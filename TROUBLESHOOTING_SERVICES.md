# Services Feature - Troubleshooting Guide

## The Problem
Salon owner services page shows:
- "No services available yet" in Active Services
- "All services are set up!" in Make Services Available

This happens when either:
1. No services exist in the database
2. Services exist but are NOT marked as `isActive = true`
3. API isn't returning them correctly

## Step 1: Check Database

Run this SQL query to see what services exist:

```sql
SELECT id, name, isActive, salonId FROM services;
```

### Expected Result:
If working correctly, you should see:
```
id | name       | isActive | salonId
---|------------|----------|--------
1  | Haircut    | 1        | NULL
2  | Coloring   | 1        | NULL
3  | Massage    | 1        | NULL
```

### If Empty:
**You need to create services in the admin dashboard first.**

## Step 2: Create Test Services (if none exist)

If the table is empty, run this INSERT:

```sql
INSERT INTO services (name, is_active, include_in_search) VALUES 
('Haircut', 1, 1),
('Hair Coloring', 1, 1),
('Massage', 1, 1),
('Facial', 1, 1),
('Hair Treatment', 1, 1);
```

Then verify:
```sql
SELECT * FROM services WHERE is_active = 1;
```

**Should return 5 rows.**

## Step 3: Verify API Endpoint

Open your browser and visit directly (replace localhost with your API URL):

```
http://localhost:8080/api/salon-owner/services/available
```

### Expected Response:
```json
{
  "services": [
    {
      "id": 1,
      "name": "Haircut",
      "isActive": true,
      "salonId": null,
      "createdAt": "2024-01-01T00:00:00"
    },
    ...
  ]
}
```

### If Empty:
```json
{
  "services": []
}
```

**This means no services with isActive=true exist in the database.**

## Step 4: Check Browser Console

1. Open Developer Tools: **F12**
2. Go to **Console** tab
3. Click Services in sidebar
4. Watch for errors

You should see logs like:
```
loadAvailableServicesForPricing: Starting service load for email: owner@example.com
Available services data: Object { services: Array(5) }
Unavailable services (to add): 5
displayAvailableServiceForPricing called with: { servicesCount: 5, salonId: 123 }
```

### If you see errors:
Share them in the console output

## Step 5: Verify Admin Can Create Services

1. Log in as Admin
2. Navigate to Admin Dashboard
3. Try to create a service manually:
   - Name: "Test Service"
   - Submit

Check if it appears in database:
```sql
SELECT * FROM services ORDER BY created_at DESC LIMIT 1;
```

## The Complete Data Flow Should Be:

```
Admin Dashboard
    ↓
POST /api/admin/services { name: "Haircut", includeInSearch: true }
    ↓
ServiceItem created with isActive=true
    ↓
[Database: services table]
    ↓
Salon Owner visits Services page
    ↓
GET /api/salon-owner/services/available
    ↓
Returns: services WHERE isActive = true
    ↓
Displays in "Make Services Available" grid
    ↓
[User clicks service, sets price]
    ↓
POST /api/salon-owner/services/add-available-service
    ↓
ServicePrice record created
    ↓
[Database: service_prices table]
    ↓
GET /api/salon-owner/services/with-prices/{salonId}
    ↓
Returns: services WITH prices
    ↓
Displays in "Available Services" table
```

## Quick Fix Checklist

- [ ] Services exist in database with `is_active = 1`
- [ ] API endpoint `/salon-owner/services/available` returns services
- [ ] No errors in browser console
- [ ] API_BASE_URL is correct in frontend
- [ ] Salon ID is being loaded correctly

## If Still Not Working

Please provide:
1. Output of: `SELECT * FROM services;`
2. Response from: `http://your-api-url/api/salon-owner/services/available`
3. Browser console error messages (F12 → Console)
4. Check if backend is running: Try accessing `http://localhost:8080/api/admin/overview`
