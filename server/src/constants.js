// Shared words used by models, services and controllers. Money is ALWAYS whole paise (integers).
const TOLLS_TEXT = 'Tolls are not included in the quoted fare.';
const ESTIMATE_TEXT = 'This is an estimate, not a quote. The owner confirms the final price.';

// Booking lifecycle. Matches the status keys the React frontend already understands.
// 'pending' = request submitted and waiting for the owner. Nothing here means "confirmed" until payment rules exist.
const BOOKING_STATUS = ['pending', 'needs_info', 'rejected', 'quoted', 'accepted', 'confirmed', 'active', 'completed', 'cancelled', 'expired'];
// What the owner may set directly through the status endpoint (other moves happen through quotes, payments, trips).
const OWNER_STATUS_MOVES = { pending: ['needs_info', 'rejected'], needs_info: ['pending', 'rejected'], quoted: ['rejected'] };

const QUOTE_STATUS = ['draft', 'issued', 'accepted', 'declined', 'expired', 'superseded'];
const RESERVATION_TYPE = ['hold', 'confirmed'];
const RESERVATION_STATUS = ['active', 'released', 'reassigned', 'completed'];
module.exports = { TOLLS_TEXT, ESTIMATE_TEXT, BOOKING_STATUS, OWNER_STATUS_MOVES, QUOTE_STATUS, RESERVATION_TYPE, RESERVATION_STATUS };
