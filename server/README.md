# Server (Node + Express + MongoDB)

Needs Node 18+ and a MongoDB database (local, or a free MongoDB Atlas cluster).

## Run
```bash
cd server
npm install
cp .env.example .env        # then edit .env (MONGODB_URI, OWNER_API_KEY; GOOGLE_MAPS_API_KEY when the owner has one)
npm run seed:example        # creates EMPTY pricing settings (categories only: no seats, no rates)
npm run dev                 # http://localhost:5000
```
Frontend (second terminal, from the project root):
```bash
cp .env.example .env        # set VITE_API_URL=http://localhost:5000
npm install && npm run dev  # http://localhost:5173
```
## Test (no database or internet needed)
```bash
cd server && npm test       # 36 tests: pricing engine, validation, estimate/submit/status/quote logic, route parsing
```
## Try it by hand
Rates are the owner's to decide. To see an estimate locally, set TEST values yourself (here `<paise>` means your own number, for example from a calculator):
```bash
curl -X PUT localhost:5000/api/owner/pricing-settings -H "x-owner-key: $OWNER_API_KEY" -H "Content-Type: application/json" \
  -d '{"vehicleCategories":[{"key":"sedan","label":"Sedan","seats":4,"ratePerKmPaise":<paise>}],"emptyReturn":{"mode":"none"},"tax":{"mode":"none"}}'
curl localhost:5000/api/owner/pricing-settings -H "x-owner-key: $OWNER_API_KEY"      # shows what is still unresolved
curl localhost:5000/api/vehicle-categories
```
Without `GOOGLE_MAPS_API_KEY` the estimate answers "route not configured" with no distance and no fare. That is intended. Details: `docs/BACKEND_PLAN.md`.
