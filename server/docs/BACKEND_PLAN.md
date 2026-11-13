# Backend plan: pricing engine and data model

Status labels: IMPLEMENTED (code exists), TESTED (an automated test ran here), PLACEHOLDER (structure only), OWNER DECISION (setting stays empty until the owner answers).

## 1. Project structure
```
gujarat-taxi-frontend/           <- your existing project (React + Vite, unchanged design)
  src/ ...                       <- frontend (only src/services/api.js, TripRequest.jsx, BookingStatus.jsx got small edits)
  server/                        <- NEW: Node + Express + MongoDB, its own package.json
    src/
      server.js  app.js  config.js  constants.js
      models/        10 Mongoose models
      services/      pricingEngine.js  quoteMath.js  tripValidation.js  settingsValidation.js  routeService.js  reservationService.js
      controllers/   publicController.js  ownerController.js
      routes/        public.js  owner.js
      middleware/    ownerAuth.js  errorHandler.js
    tests/           node:test suites (36 tests)
    scripts/seedExample.js
```
Why this shape: the **services** hold the rules and have no database or web code, so a beginner can read `pricingEngine.js` top to bottom and the tests can run anywhere. Controllers only connect HTTP to services.

## 2. The pricing formula
```
billable metres  = one-way: route distance        round trip: outbound + return   (only if the owner set roundTripBilling = sum_of_legs)
BASE FARE        = round( billable metres x category rate per km / 1000 )          integer paise
+ EMPTY RETURN   = one-way only, only if the owner chose a rule (percent of base). Never automatic doubling.
+ DRIVER ALLOWANCE, OVERNIGHT, EXTRA STOPS, PASSENGER SURCHARGE   only if the owner approved an amount
MINIMUM FARE     = lifts the subtotal if the owner set one
+ TAX            = only if the owner set a tax rule
TOLLS            = never included (always printed as an exclusion)
WAITING          = never estimated (time unknown); the owner adds it when quoting
```
Rules that keep it honest:
* `null` in settings = **owner has not decided**, `0` = **owner decided: no charge**. Undecided items are listed in `excluded` and make the estimate `partial`.
* Estimate status: `complete` (all needed rules set), `partial` (some missing: no fare figure is shown to the customer), `unavailable` (no route, no rate, no category, capacity exceeded, out of range, round-trip billing unset).
* Google supplies distance and time. Travel **time is never used** in the fare (tested).
* Passengers: **capacity check only**, unless the owner approves a surcharge.
* The 1,000 km limit is `maxOneWayKm` with `maxDistanceConfirmed: false`, so every estimate carries a "provisional" warning until the owner approves it. Whether it is per leg or per round trip is `distanceLimitAppliesTo` (undecided = per leg is used and warned). Out-of-range goes to manual review unless the owner chose `block`.
* Multi-stop and multi-day are always flagged for manual review (setting `manualReview`, default on).

## 3. Estimate -> quote -> booking (nothing skips the owner)
1. Customer submits trip details. The server **re-validates**, **asks Google itself**, and runs the engine. Browser-sent fare, distance, status or payment fields are never read (tested).
2. The request is stored as a `Booking` with status `pending`, the route facts and the estimate snapshot. It is **never** confirmed here.
3. The owner reviews, may re-run or manually enter the route (with a reason), creates a **draft quote** (pre-filled from the estimate), edits line items, and **issues** it. The server recomputes totals. Validity must come from settings or be given explicitly (no invented expiry).
4. The quote stores `pricingSnapshot` (settings version, rates, route used). Later settings changes cannot alter it.
5. Customer sees the quote and accepts or declines. Accepting moves the booking to `accepted` = awaiting advance payment. **Confirmed** needs verified payment, which is not built yet.
6. If the route changes after a quote, the booking is flagged `routeChangedAfterQuote` and acceptance is blocked until a revised quote is issued.

## 4. Models (purpose, key fields, relationships)
| Model | Purpose | Key fields | Relationships |
|---|---|---|---|
| PricingSettings | One document of every owner rule | version, maxOneWayKm + maxDistanceConfirmed, distanceLimitAppliesTo, roundTripBilling, vehicleCategories[key,label,seats,ratePerKmPaise,active], optional charges, emptyReturn, tax, manualReview, quoteValidityHours | Read by estimates and quotes (version recorded in each) |
| Customer | Someone who requests trips (guests allowed) | name, mobile (unique, +91), email | has many Bookings |
| Booking | The **request**; becomes a booking only at status `confirmed` | reference, trackingTokenHash, contact snapshot, trip fields, routeSnapshot (google / owner_manual / unavailable), estimate, manualReviewReasons, status, statusHistory, currentQuoteId | belongs to Customer; has Quotes, Reservations, Payments, TripExpenses |
| Quote | Owner's price offer, versioned, immutable once issued | bookingId, versionNumber, status, lineItems, subtotal/tax/total (paise), pricingSnapshot, validUntil / noExpiry, advanceRequiredPaise | belongs to Booking; unique (bookingId, versionNumber) |
| Vehicle | A car | registrationNumber (unique), categoryKey, seats, status | has Reservations |
| Driver | A driver | name, mobile, licenceNumber (unique), licenceExpiry, status | has Reservations |
| Reservation | Time block on a vehicle (+ driver). `hold` expires; `confirmed` is firm | bookingId, vehicleId, driverId, type, status, startAt, endAt (incl. buffer), holdExpiresAt | belongs to Booking, Vehicle, Driver |
| Payment (model only) | One gateway attempt; counts only when `verified` | bookingId, quoteId, purpose, amountPaise, status, gatewayOrderId/PaymentId (unique), signatureVerified | belongs to Booking, Quote; has Refunds |
| Refund (model only) | A refund **request** is not a refund; money moved only at `completed` with gatewayRefundId | paymentId, bookingId, status, requested/approved amounts, decidedBy | belongs to Payment, Booking |
| TripExpense (model only) | Costs recorded against a trip | bookingId, type, amountPaise, paidBy, recoverableFromCustomer | belongs to Booking |

Separation guaranteed by the model: request (Booking) vs final quote (Quote) vs reservation (Reservation) vs payment transaction (Payment) vs refund (Refund). All money is integer paise.

## 5. Endpoint plan
Public (rate-limited POSTs):
| Method and path | Purpose | Status |
|---|---|---|
| GET /api/health | Is the server up | IMPLEMENTED |
| GET /api/vehicle-categories | Category names and seats (no rates) | IMPLEMENTED, TESTED |
| POST /api/route-estimate | Server-side route + estimate | IMPLEMENTED, TESTED |
| POST /api/trip-requests | Submit a request (creates a `pending` booking) | IMPLEMENTED, TESTED (fake database) |
| GET /api/bookings/:reference?token= | Customer status view | IMPLEMENTED, TESTED (fake database) |
| POST /api/bookings/:reference/quote-response | Accept or decline the open quote | IMPLEMENTED, TESTED (fake database) |

Owner (header `x-owner-key`, temporary protection):
| Method and path | Purpose |
|---|---|
| GET /api/owner/bookings?status=&q= , GET /api/owner/bookings/:id | Queue and detail |
| POST /api/owner/bookings/:id/status | needs_info / rejected moves only |
| POST /api/owner/bookings/:id/route | Recalculate via Google, or manual metres with a reason |
| POST /api/owner/bookings/:id/quote-draft | Draft from the estimate |
| PUT /api/owner/quotes/:id , POST /api/owner/quotes/:id/issue | Edit draft lines, issue |
| GET/PUT /api/owner/pricing-settings | Rules, plus list of unresolved decisions |
| GET/POST/PATCH /api/owner/vehicles , /drivers | Fleet |
| GET /api/owner/availability?from=&to= , POST /api/owner/reservations | Availability and conflict-checked reservations |

Not built: payments, refunds, expenses endpoints; confirmation; notifications; real owner login.

## 6. Owner decisions still needed (each maps to a setting)
Per-km rate and seats per category; whether max distance 1,000 km is approved and whether it is per leg or round trip; minimum distance; out-of-range behaviour; how round trips are billed; empty-return rule; driver allowance, overnight, extra-stop, waiting charges; minimum fare; tax; quote validity; advance amount and deadline; hold duration; buffer; cancellation and refund rules; guest vs account; communication channel.
