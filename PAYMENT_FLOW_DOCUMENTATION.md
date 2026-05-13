# SNIP ME - Custom Payment Gateway Flow

## Overview
The booking system now uses a **custom payment gateway** instead of PayHere popup for prototype testing.

---

## Complete Booking & Payment Flow

### **STEP 1: Salon Selection (Step 1)**
- User selects salon, service, and date
- Frontend calls: `/api/bookings/available-by-salon?salonId={id}&date={date}`
- Response: List of available time slots

### **STEP 2: Time Slot Selection (Step 2)**
- User selects an available time slot
- Data stored in `bookingState.selectedSlot`

### **STEP 3: Payment Confirmation (Step 3)**

#### **Phase A: User initiates payment**
```
User clicks: "Proceed to Pay" button
↓
Frontend shows: Custom payment gateway form
              (payment-gateway card with card fields)
↓
Backend endpoint: /payment/hash (GET)
  - Receives: orderId, amount, currency
  - Returns: Test card details + payment metadata
```

#### **Response from `/payment/hash`:**
```json
{
  "merchant_id": "1235274",
  "order_id": "SNIPME-{timestamp}",
  "amount": "{servicePrice}",
  "currency": "LKR",
  "hash": "DUMMY_HASH_FOR_TESTING",
  "card_number": "4111111111111111",
  "card_holder_name": "Test User",
  "card_expiry": "12/29",
  "card_cvv": "123",
  "mastercard_number": "5555555555554444",
  "amex_number": "378282246310005"
}
```

**Frontend auto-fills test card details in the payment form:**
- Card Number: `4111111111111111` (VISA test card)
- Name: `Test User`
- Expiry: `12/29`
- CVV: `123`

---

#### **Phase B: User confirms payment**
```
User clicks: "Confirm Booking" button on payment form
↓
Frontend validates card fields:
  ✓ Cardholder name (min 2 chars)
  ✓ Card number (16 digits)
  ✓ Expiry (MM/YY format)
  ✓ CVV (min 3 digits)
↓
Backend endpoint 1: /bookings/initiate (POST)
  - Purpose: Lock the time slot (pessimistic write lock)
  - Params: slotID, customerID
  - Response: Slot locked confirmation (or 409 if taken)
↓
Backend endpoint 2: /payment/hash (GET)
  - Purpose: Get payment details & test card info
  - Params: orderId, amount, currency
  - Response: Payment metadata + test card details
↓
Backend endpoint 3: /bookings/confirm (POST)
  - Purpose: Permanently confirm the booking
  - Params: slotID, customerID
  - Response: Booking confirmed message
↓
Frontend shows: Success screen with booking details
```

---

## Backend Endpoints Reference

### **1. Lock Slot (Initiate Booking)**
```
POST /api/bookings/initiate
Parameters:
  - slotID (Long): Time slot ID to lock
  - customerID (Long): Customer making the booking

Response (Success):
  HTTP 200: "Slot held successfully. Proceed to payment for Slot ID: {slotID}"

Response (Conflict):
  HTTP 409: "Slot is no longer available" (or similar error)
```

### **2. Get Payment Hash & Test Card**
```
GET /api/payment/hash
Parameters:
  - orderId (String): Unique order ID
  - amount (String): Total amount to pay
  - currency (String, default="LKR"): Currency code

Response:
  HTTP 200: JSON with merchant details + test card credentials
  {
    "merchant_id": "1235274",
    "order_id": "{orderId}",
    "amount": "{amount}",
    "currency": "{currency}",
    "hash": "DUMMY_HASH_FOR_TESTING",
    "card_number": "4111111111111111",
    "card_holder_name": "Test User",
    "card_expiry": "12/29",
    "card_cvv": "123"
  }
```

### **3. Confirm Booking**
```
POST /api/bookings/confirm
Parameters:
  - slotID (Long): Time slot ID to confirm
  - customerID (Long): Customer ID

Response (Success):
  HTTP 200: "Payment Successful! Appointment Confirmed. Slot ID: {slotID}"

Response (Error):
  HTTP 400: Error message (e.g., "Slot not locked" or "Slot already confirmed")
```

---

## Payment Processing Logic

### **1. Card Validation (Frontend)**
```javascript
✓ Cardholder name: minimum 2 characters
✓ Card number: exactly 16 digits
✓ Expiration: MM/YY format (two digits / two digits)
✓ CVV: minimum 3 digits
```

### **2. Test Card Types**
All these cards are **sandbox test cards** and work for prototype testing:

| Card Type | Test Number | Expiry | CVV |
|-----------|-------------|--------|-----|
| VISA | 4111111111111111 | 12/29 | 123 |
| MasterCard | 5555555555554444 | 12/29 | 123 |
| American Express | 378282246310005 | 12/29 | 123 |

---

## Frontend Code Changes

### **Disabled:**
- ❌ `setupPayHereHandlers()` - PayHere popup handlers (commented out)
- ❌ `payhere.startPayment()` - PayHere sandbox popup (commented out)

### **Enabled:**
- ✅ Custom payment form (HTML: `.pg-wrapper`)
- ✅ Auto-fill test card details from backend
- ✅ Card validation (Luhn algorithm for card number, format checks)
- ✅ Direct booking confirmation via `/bookings/confirm`

---

## State Management

### **bookingState Object**
```javascript
{
  salonId:         Long,              // Salon ID
  salonName:       String,            // Salon name
  selectedService: {                  // Selected service
    serviceId:     Long,
    serviceName:   String,
    price:         BigDecimal
  },
  selectedDate:    String,            // YYYY-MM-DD format
  selectedSlot:    {                  // Selected time slot
    slotID:        Long,
    label:         String,
    startTime:     String
  },
  customerID:      Long,              // Current customer ID
  bookingID:       String,            // Booking confirmation ID
  orderId:         String,            // Payment order ID
  paymentData:     {                  // Payment details from backend
    order_id:      String,
    merchant_id:   String,
    amount:        String,
    currency:      String,
    hash:          String
  }
}
```

---

## Testing Instructions

### **Quick Test Flow:**
1. Open `/Frontend/booking.html`
2. Select a salon → select a service → pick a date
3. Click "Next" → select an available time slot → click "Next"
4. Click "Proceed to Pay" → payment form appears
5. Card fields auto-fill with test card details:
   - **Card**: 4111 1111 1111 1111
   - **Name**: Test User
   - **Expiry**: 12/29
   - **CVV**: 123
6. Click "Confirm Booking"
7. Success! Booking confirmed and payment data logged to console

### **Console Logs to Monitor:**
```javascript
✓ Test card details auto-filled:
  Card: 4111111111111111
  Name: Test User
  Expiry: 12/29
  CVV: 123

✓ Custom Payment Gateway Process:
  ✓ Card validated
  ✓ Time slot locked
  ✓ Hash received: DUMMY_HASH_FOR_TESTING
  ✓ Now confirming booking with /bookings/confirm endpoint...

✓ Backend confirmed: Payment Successful! Appointment Confirmed. Slot ID: {slotID}
```

---

## Notes for Production Migration

⚠️ **IMPORTANT:** This implementation uses **dummy test cards** for prototype testing.

For production deployment, you will need to:
1. Replace `PaymentController.generateHash()` with real payment gateway integration
2. Remove test card details from response
3. Implement actual payment validation
4. Add payment record persistence to database
5. Integrate with real payment provider (PayHere, Stripe, etc.)

---

## Troubleshooting

### **Issue: "Cannot reach backend on port 8080"**
- Ensure Spring Boot is running: `mvn spring-boot:run`
- Check backend is listening on `http://localhost:8080`

### **Issue: "Slot was just booked by someone else"**
- Time slot was locked by another customer
- Frontend will refresh available slots
- User can select another time

### **Issue: Payment form shows placeholder instead of test card**
- Check backend response includes `card_number`, `card_holder_name`, etc.
- Verify `/payment/hash` endpoint is returning correct JSON

### **Issue: Booking not confirming**
- Check browser console for error messages
- Verify `/bookings/confirm` endpoint is reachable
- Ensure `slotID` and `customerID` parameters are correct

---

Last Updated: May 13, 2026
