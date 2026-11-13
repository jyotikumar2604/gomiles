// DEMO DATA ONLY. Used by the owner dashboard and the booking-status preview so the layout can be
// seen. Delete this file (and its imports) when the real API exists. No prices or payments are invented.
export const DEMO_BOOKINGS = [
  { ref: 'DEMO-001', customer: 'Demo customer A', route: 'Ahmedabad to Rajkot', tripType: 'One-way', date: '2026-11-03', passengers: 3, status: 'pending', manual: false },
  { ref: 'DEMO-002', customer: 'Demo customer B', route: 'Surat to Vadodara, stop at Bharuch', tripType: 'Round trip', date: '2026-11-05', passengers: 5, status: 'pending', manual: true },
  { ref: 'DEMO-003', customer: 'Demo customer C', route: 'Vadodara to Bhuj', tripType: 'One-way', date: '2026-11-08', passengers: 2, status: 'quoted', manual: false },
  { ref: 'DEMO-004', customer: 'Demo customer D', route: 'Rajkot to Ahmedabad', tripType: 'Round trip', date: '2026-11-10', passengers: 4, status: 'accepted', manual: false },
  { ref: 'DEMO-005', customer: 'Demo customer E', route: 'Ahmedabad to Surat', tripType: 'One-way', date: '2026-11-12', passengers: 2, status: 'confirmed', manual: false },
  { ref: 'DEMO-006', customer: 'Demo customer F', route: 'Gandhinagar to Dwarka', tripType: 'Round trip', date: '2026-10-26', passengers: 6, status: 'active', manual: true },
  { ref: 'DEMO-007', customer: 'Demo customer G', route: 'Bhavnagar to Ahmedabad', tripType: 'One-way', date: '2026-10-18', passengers: 1, status: 'completed', manual: false },
  { ref: 'DEMO-008', customer: 'Demo customer H', route: 'Jamnagar to Rajkot', tripType: 'One-way', date: '2026-11-01', passengers: 2, status: 'cancelled', manual: false },
];
export const DEMO_VEHICLES = [
  { id: 'V1', label: 'Demo vehicle 1', category: 'Sedan', seats: 4, status: 'available' },
  { id: 'V2', label: 'Demo vehicle 2', category: 'SUV', seats: 6, status: 'available' },
  { id: 'V3', label: 'Demo vehicle 3', category: 'Sedan', seats: 4, status: 'maintenance' },
];
export const DEMO_DRIVERS = [
  { id: 'D1', name: 'Demo driver A', status: 'available' },
  { id: 'D2', name: 'Demo driver B', status: 'on-leave' },
];
