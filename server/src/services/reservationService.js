// Prevents double-booking. Stored interval = trip start .. trip end PLUS the buffer (buffer length is an owner decision).
// A 'hold' only blocks while it has not expired; a 'confirmed' reservation always blocks.
const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && aEnd > bStart;

async function findConflicts(Reservation, { vehicleId, driverId, startAt, endAt, excludeId, now = new Date() }) {
  const who = [{ vehicleId }];
  if (driverId) who.push({ driverId });
  const q = { status: 'active', startAt: { $lt: endAt }, endAt: { $gt: startAt },
    $and: [{ $or: who }, { $or: [{ type: 'confirmed' }, { type: 'hold', holdExpiresAt: { $gt: now } }] }] };
  if (excludeId) q._id = { $ne: excludeId };
  return Reservation.find(q).lean();
}
module.exports = { overlaps, findConflicts };
