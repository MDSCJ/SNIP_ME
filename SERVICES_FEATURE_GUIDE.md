# Salon Owner Services Feature - Complete Guide

## Overview
This guide explains how the services feature works in the SNIP ME application, allowing salon owners to view admin-enabled services and add them with custom pricing.

## Architecture

### 1. Service Classes & Database
- **ServiceItem**: Represents a service available in the system (created by admin)
  - `id`: Service ID
  - `name`: Service name
  - `isActive`: Whether the service is enabled
  - `includeInSearch`: Whether to show in searches
  
- **ServicePrice**: Links services to specific salons with pricing
  - `salonId`: Salon ID
  - `serviceId`: Service ID (FK to ServiceItem)
  - `price`: Price set by the salon owner

- **ServiceRequest**: Custom service requests from salon owners
  - `salonId`: Requesting salon
  - `serviceName`: Name of requested service
  - `description`: Details about the request
  - `status`: PENDING, APPROVED, REJECTED

### 2. Backend API Endpoints

#### Get Available Services (Admin-Enabled)
```
GET /api/salon-owner/services/available
Response:
{
  "services": [
    { "id": 1, "name": "Haircut", "isActive": true, "createdAt": "2024-01-01..." },
    { "id": 2, "name": "Coloring", "isActive": true, "createdAt": "2024-01-02..." }
  ]
}
```

#### Get Salon's Services with Pricing
```
GET /api/salon-owner/services/with-prices/{salonId}
Response:
{
  "services": [
    { 
      "serviceId": 1,
      "serviceName": "Haircut",
      "price": 500.00,
      "pricingId": 10
    },
    { 
      "serviceId": 2,
      "serviceName": "Coloring",
      "price": 1500.00,
      "pricingId": 11
    }
  ]
}
```

#### Add Service with Pricing
```
POST /api/salon-owner/services/add-available-service
Request:
{
  "salonId": 5,
  "serviceId": 1,
  "price": 500.00
}
Response:
{
  "message": "Service has been added as available with pricing",
  "salonId": 5,
  "serviceId": 1,
  "price": 500.00
}
```

#### Get Service Requests
```
GET /api/salon-owner/services/requests/{salonId}
Response:
{
  "requests": [
    { "id": 1, "salonId": 5, "serviceName": "Threading", "status": "PENDING" }
  ]
}
```

### 3. Frontend Flow

#### Step 1: Load Services Section
When user clicks on "Services" in the sidebar:
1. `setupServicesSection()` is called (on DOMContentLoaded)
2. Two parallel loads are initiated:
   - `loadOwnerServices()` → Loads salon's services WITH pricing
   - `loadAvailableServicesForPricing()` → Loads services available to add

#### Step 2: Display Active Services
```javascript
loadOwnerServices()
  ↓
Gets owner email from localStorage
  ↓
Fetches owner profile to get salonId
  ↓
fetchServicesForSalon(salonId)
  ↓
Calls: GET /api/salon-owner/services/with-prices/{salonId}
  ↓
displayServices(services)
  ↓
Renders in "Available Services" table with:
- Service Name
- Status (Available)
- Price (₨xxx.xx)
```

#### Step 3: Display Available Services to Add
```javascript
loadAvailableServicesForPricing()
  ↓
Gets owner email, then salonId
  ↓
Fetches ALL available services (admin-enabled)
  ↓
Fetches services already added (with pricing)
  ↓
Filters: Show only services NOT yet added
  ↓
displayAvailableServicesForPricing(remainingServices)
  ↓
Renders in "Make Services Available" grid with:
- Service Icon (based on service name)
- Service Name
- "Tap to add pricing" instruction
```

#### Step 4: Add Service with Pricing
User clicks on a service card:
```
openServicePricingModal()
  ↓
Display modal with:
- Service icon
- Service name
- Price input field
  ↓
User enters price and confirms
  ↓
submitServicePricing()
  ↓
POST /api/salon-owner/services/add-available-service
  ↓
Success:
- Show toast notification
- Close modal
- Reload available services grid (removes just-added service)
- Reload active services table (shows newly added service with price)
```

## Complete Use Case Workflow

### Scenario: Admin Creates a Service, Salon Owner Adds It

1. **Admin Actions**:
   - Admin dashboard creates new service: "Threading" (ServiceItem created with isActive=true)
   - Service becomes available to all salon owners

2. **Salon Owner Views Services**:
   - Logs in and navigates to Services section
   - Sees "Available Services" table (empty initially if no services added)
   - Sees "Make Services Available" grid with "Threading" card displayed

3. **Salon Owner Adds Service with Price**:
   - Clicks on "Threading" card
   - Pricing modal opens
   - Enters price: 300.00
   - Clicks "Add Service"
   - System saves to service_prices table: (salonId: X, serviceId: Y, price: 300.00)
   - Toast shows: "Threading added at 300.00!"

4. **Salon Owner Sees Updated Services**:
   - "Available Services" table now shows:
     | Service Name | Status    | Price   |
     |--------------|-----------|---------|
     | Threading    | Available | ₨300.00 |
   - "Make Services Available" grid no longer shows "Threading" (already added)

## Testing Checklist

- [ ] Admin has created at least one service in the system
- [ ] Service has `isActive = true` in database
- [ ] Salon owner can see the service in "Make Services Available" grid
- [ ] Clicking the service opens the pricing modal
- [ ] Entering a price and submitting creates a service_prices record
- [ ] "Available Services" table refreshes and shows the new service with price
- [ ] "Make Services Available" grid removes the service (no longer available to add)
- [ ] Salon owner can add multiple services
- [ ] Custom service request feature works (Request New Custom Service)
- [ ] Service requests appear in "Service Requests" table

## Database Queries for Testing

```sql
-- Check all available services
SELECT * FROM services WHERE is_active = true;

-- Check services added by a specific salon (e.g., salon_id = 5)
SELECT sp.*, si.name
FROM service_prices sp
JOIN services si ON sp.service_id = si.id
WHERE sp.salon_id = 5;

-- Check service requests from a salon
SELECT * FROM service_requests WHERE salon_id = 5;
```

## Troubleshooting

**Issue**: Salon owner can't see admin-enabled services  
**Solution**: Verify that services in the database have `is_active = true`

**Issue**: Service doesn't appear in "Available Services" after adding  
**Solution**: Check that the service_prices record was created correctly, then refresh the page

**Issue**: Price shows as "N/A" in the table  
**Solution**: Ensure the price field is not null in service_prices table

**Issue**: Available services grid doesn't load  
**Solution**: Check browser console for API errors, verify API_BASE_URL is configured correctly

## File Changes Made

### Backend
- `SalonOwnerServiceController.java`: Endpoints already implemented and working

### Frontend
1. **Salon-Owner-Script.js**:
   - Updated `fetchServicesForSalon()` to call `/with-prices/{salonId}` endpoint
   - Updated `displayServices()` to show prices in the table
   
2. **Salon-Owner-Dashboard.html**:
   - Updated table header: Changed "Added" column to "Price"

## Key Features

✅ Admin can enable/disable services  
✅ Salon owners see only enabled services  
✅ Salon owners can set custom prices per service  
✅ Services display with prices after being added  
✅ Already-added services don't appear in the "add" grid  
✅ Service requests feature for custom services  
✅ Toast notifications for user feedback  
✅ Real-time UI updates after adding services  

## Next Steps (Optional Enhancements)

- [ ] Add service categories/tags
- [ ] Allow editing of existing service prices
- [ ] Add ability to deactivate services
- [ ] Service statistics/analytics
- [ ] Service-to-beautician mapping
- [ ] Service duration and availability slots
