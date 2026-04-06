# Search Bar Implementation - Location-Based Salon Search

## Overview
Implemented a fully functional search bar with location-based filtering, sorting, and pagination for finding nearby salons.

## Features

### 1. Location Detection
- **Geolocation API**: Automatically detects user's current location (latitude/longitude)
- **Fallback**: Uses Sri Lanka center coordinates (7.8731°N, 80.7718°E) if permission denied
- **Manual Location**: Users can also use the location picker on the search form

### 2. Distance Calculation
- **Algorithm**: Pythagorean theorem approximation
- **Formula**: `distance = sqrt((lat2-lat1)² × 111² + (lon2-lon1)² × (111×cos(avg_lat))²)`
- **Accuracy**: ~111 km per degree (latitude), adjusted for longitude by latitude cosine
- **5 km Conversion**: Approximates to ~0.045 degrees latitude
- **Range Slider**: Users can adjust radius from 1-50 km to discover more/fewer salons

### 3. Sorting Options
- **By Rating** ⭐: Default sort - highest rated salons first
- **By Price** 💰: Sort by average service price (extensible)
- **Dynamic**: Sorting is applied instantly to current results

### 4. Pagination
- **Page Size**: 10 salons per page
- **Navigation**: Next/Previous buttons automatically enabled/disabled
- **Page Info**: Shows "Page X of Y (Total salons)" for 5km radius
- **Current Results**: Updates when radius or sort changes

### 5. UI/UX
- **Search Section**: Positioned below video hero and above trending salons
- **Result Cards**: Display:
  - Salon name and distance
  - Star rating and review count
  - Location and operating hours
  - Description preview
  - View and Book Now buttons
- **Responsive Design**: Grid layout with 1-3 columns based on screen size

## Backend Implementation

### New API Endpoint
**GET** `/api/public/salons/search`

#### Parameters:
- `latitude` (optional): User's latitude
- `longitude` (optional): User's longitude
- `radiusKm` (default: 5): Search radius in kilometers
- `sortBy` (default: "rating"): Sort criteria - "rating" or "price"
- `page` (default: 0): Page number (0-indexed)

#### Response:
```json
{
  "salons": [
    {
      "id": 1,
      "name": "Salon Name",
      "description": "Description",
      "photo": "base64_encoded_image",
      "address": "Street Address",
      "city": "City Name",
      "rating": 4.5,
      "numberOfRatings": 120,
      "openingTime": "9:00 AM",
      "closingTime": "6:00 PM",
      "latitude": 6.9271,
      "longitude": 80.7789,
      "distance": 2.34
    }
  ],
  "totalCount": 45,
  "hasMore": true,
  "currentPage": 0
}
```

### Database Query
```sql
SELECT s FROM Salon s WHERE s.isActive = true 
  AND s.latitude IS NOT NULL 
  AND s.longitude IS NOT NULL
```

## Frontend Implementation

### Key JavaScript Functions

1. **getUserLocation()**
   - Requests geolocation permission
   - Falls back to Sri Lanka center if denied
   - Stores coordinates globally

2. **performSearch()**
   - Validates user location
   - Calls `/api/public/salons/search` with current filters
   - Handles pagination and sorting
   - Updates results dynamically

3. **displaySearchResults(data)**
   - Renders salon cards with distance, rating, hours
   - Attaches View/Book Now event listeners
   - Updates pagination controls

4. **attachSearchResultListeners()**
   - View button: Toggles expanded card view
   - Book Now button: Stores salon info in sessionStorage and redirects

### Event Handlers
- **Sort Buttons**: Reset to page 0, update sorting
- **Distance Slider**: Triggers new search with updated radius
- **Search Button**: Initiates search with current filters
- **Pagination**: Load previous/next pages

## Files Modified

### Backend
- **PublicSalonController.java**: Added `/api/public/salons/search` endpoint with distance calculation
- **SalonRepository.java**: Added `findAllActiveSalonsWithLocation()` query

### Frontend
- **index.html**: Added search results section and Font Awesome CDN
- **home.css**: Added styles for search controls, result cards, pagination
- **main.js**: Added geolocation, search, sorting, and pagination functions

## Distance Calculation Details

The system uses the Pythagorean theorem to approximate distance:

```java
double latDiff = lat2 - lat1;
double lonDiff = lon2 - lon1;
double avgLat = (lat1 + lat2) / 2.0;

double latKm = latDiff * 111.0;  // 1° latitude ≈ 111 km
double lonKm = lonDiff * 111.0 * Math.cos(Math.toRadians(avgLat));

return Math.sqrt(latKm * latKm + lonKm * lonKm);
```

### 5 km Radius Reference
- Latitude: ±0.045° (approximately)
- Longitude: Varies with latitude, ±0.045°/cos(latitude) degrees
- At Sri Lanka's latitude (~7.87°): ±0.045° longitude ≈ ±4.95 km

## Search Flow

1. Page loads → Geolocation permission requested
2. User fills search form → clicks Search
3. Frontend validates location, calls API with:
   - User coordinates
   - 5 km radius (or user-adjusted)
   - Current sort preference
   - Page number
4. Backend filters salons:
   - Calculates distance to each active salon
   - Filters by radius
   - Sorts by rating/price
   - Paginates (10 per page)
5. Results displayed with:
   - Cards showing salons, distances
   - Sort/filter controls
   - Pagination controls
6. User can:
   - Change radius (1-50 km)
   - Switch sort order
   - Navigate pages
   - Book or view salon details

## Testing Checklist

- [ ] Enable location permission in browser
- [ ] Verify geolocation auto-detects location
- [ ] Search button displays 10 results
- [ ] Distance shows correctly (in km)
- [ ] Sorting by rating works
- [ ] Sorting by price works
- [ ] Range slider updates results (1-50 km)
- [ ] Pagination buttons work (next/previous)
- [ ] Page info shows correct page number
- [ ] Book Now redirects to login/booking based on auth
- [ ] View button shows/hides extended info
- [ ] Mobile responsive layout works

## Future Enhancements

1. **Filters**: Add service type filter
2. **Search History**: Remember recent searches
3. **Favorites**: Mark favorite salons
4. **Map View**: Show salons on map with distance
5. **Directions**: Link to Google Maps for directions
6. **Reviews**: Display user reviews on card
7. **Availability**: Show real-time booking availability
8. **Price Range Filter**: Filter by service price
