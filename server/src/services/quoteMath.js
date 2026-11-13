// Owner-quote arithmetic. The server ALWAYS recomputes totals; totals sent by a browser are ignored.
const TYPES = ['base', 'approved_extra', 'adjustment'];
const isInt = (v) => Number.isInteger(v) && Math.abs(v) <= 1e9;

function validateLineItems(items) {
  const errors = [];
  if (!Array.isArray(items) || items.length < 1 || items.length > 20) return { ok: false, errors: ['Provide between 1 and 20 line items.'] };
  const clean = items.map((it, i) => {
    const code = String(it?.code ?? '').trim().slice(0, 40), label = String(it?.label ?? '').trim().slice(0, 120);
    if (!label) errors.push(`Line ${i + 1}: label is required.`);
    if (!TYPES.includes(it?.type)) errors.push(`Line ${i + 1}: type must be one of ${TYPES.join(', ')}.`);
    if (!isInt(it?.amountPaise)) errors.push(`Line ${i + 1}: amountPaise must be a whole number of paise.`);
    else if (it.type !== 'adjustment' && it.amountPaise < 0) errors.push(`Line ${i + 1}: only adjustments may be negative.`);
    return { code, label, amountPaise: it?.amountPaise, type: it?.type };
  });
  return { ok: errors.length === 0, errors, items: clean };
}

// Tax: from the owner's tax rule when it is set; otherwise the owner types an amount (flagged as manual); never invented.
function totals(items, settings, manualTaxPaise) {
  const subtotalPaise = items.reduce((t, l) => t + l.amountPaise, 0);
  const tax = settings?.tax;
  let taxPaise = 0, taxSource = 'none';
  if (tax?.mode === 'percent' && typeof tax.percent === 'number') { taxPaise = Math.round((subtotalPaise * tax.percent) / 100); taxSource = 'settings'; }
  else if (tax?.mode === 'none') taxSource = 'settings_none';
  else if (isInt(manualTaxPaise) && manualTaxPaise >= 0) { taxPaise = manualTaxPaise; taxSource = 'owner_manual'; }
  return { subtotalPaise, taxPaise, totalPaise: subtotalPaise + taxPaise, taxSource };
}
module.exports = { validateLineItems, totals };
