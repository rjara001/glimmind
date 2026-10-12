// Atomic quota metering for every paid API.
//
// A meter used to read its counter, compare it against the limit, call the paid
// API, and only then write the new value. Those two steps were separate
// operations, so N concurrent requests all read the same starting figure, all
// passed the check, and all spent — the realised ceiling was `limit x
// concurrency`. Blind writes also lost increments, so enforcement drifted
// downward: a burst recorded less than was actually spent and the quota never
// appeared exhausted.
//
// The order is now: reserve inside a transaction, call the paid API, refund if
// it throws. The transaction is what makes compare-and-increment a single
// operation. It deliberately does not wrap the API call: the callback is retried
// on contention and must stay free of external effects.
//
// Read-only quota checks belong in the meters, not here. This module only
// reserves and refunds.

// Firestore transactions are retried on contention. A retried transaction must
// produce the same result, so the callback may only read and write through the
// transaction handle — never close over outside state, never call an API.
async function runQuotaTransaction(db, spec, mutate) {
  return db.runTransaction(async (tx) => {
    const tierSnap = spec.tierRef ? await tx.get(spec.tierRef) : null;
    const tierData = tierSnap && tierSnap.exists ? tierSnap.data() : null;

    // Every read happens before any write: Firestore requires it, and it is
    // what lets the writes below compute from a consistent snapshot.
    const reads = [];
    for (const counter of spec.counters) {
      reads.push(await tx.get(counter.ref));
    }

    return mutate({ tx, tierData, reads });
  });
}

// The period a counter was last written for. A counter written on a different
// period reads as zero, which is how the daily and monthly counters reset
// without a scheduled job.
function usedForPeriod(snapshot, counter) {
  const data = snapshot.exists ? snapshot.data() : null;
  if (!data) return 0;
  if (data[counter.periodField] !== counter.periodValue) return 0;
  return Number(data[counter.field]) || 0;
}

function resolveLimit(counter, tierData) {
  return typeof counter.limit === "function" ? counter.limit(tierData) : counter.limit;
}

function counterKey(counter) {
  return counter.id || counter.field;
}

// Reads a plain numeric field off a snapshot, tolerating a missing doc. Meters
// use it for their call counters, which live on the same doc but are not the
// quota itself.
function snapshotNumber(snapshot, field) {
  const data = snapshot.exists ? snapshot.data() : null;
  return data ? Number(data[field]) || 0 : 0;
}

/**
 * Reserves the quota for one metered call.
 *
 * Returns the committed counter values keyed by `counter.id` (or `counter.field`
 * when no id is set), so callers report what was actually charged rather than
 * recomputing it from a stale read.
 *
 * Throws the error produced by the counter's `onExceed` when the call does not
 * fit, which aborts the transaction so nothing is written.
 */
async function reserveQuota(db, spec) {
  return runQuotaTransaction(db, spec, ({ tx, tierData, reads }) => {
    const committed = {};
    // Keyed by path, not by ref identity: two counters can point at the same
    // doc, and their fields have to merge instead of overwriting each other.
    const writes = new Map();

    for (let i = 0; i < spec.counters.length; i++) {
      const counter = spec.counters[i];
      const used = usedForPeriod(reads[i], counter);
      const limit = resolveLimit(counter, tierData);
      const next = used + counter.delta;

      if (next > limit) {
        throw counter.onExceed(used, limit);
      }

      committed[counterKey(counter)] = next;

      const entry = writes.get(counter.ref.path) || { ref: counter.ref, payload: {} };
      entry.payload = {
        ...entry.payload,
        // `write` receives the pre-transaction snapshot so a counter that tracks
        // calls (as opposed to units) can increment its own total.
        ...(counter.write ? counter.write(next, reads[i]) : {}),
        [counter.field]: next,
        [counter.periodField]: counter.periodValue,
      };
      writes.set(counter.ref.path, entry);
    }

    for (const entry of writes.values()) {
      tx.set(entry.ref, entry.payload, { merge: true });
    }

    return { committed, tierData };
  });
}

/**
 * Returns a reservation after the paid API call failed.
 *
 * The period guard matters: if the day or month rolled over between the reserve
 * and the refund, the stored value belongs to a period that never spent
 * anything, and decrementing it would corrupt the new period's counter.
 */
async function refundQuota(db, spec) {
  return runQuotaTransaction(db, spec, ({ tx, reads }) => {
    const refunded = {};

    for (let i = 0; i < spec.counters.length; i++) {
      const counter = spec.counters[i];
      const snapshot = reads[i];
      const data = snapshot.exists ? snapshot.data() : null;

      // Counter missing, or already reset by a period rollover: nothing to give
      // back, and touching it would subtract from the new period.
      if (!data || data[counter.periodField] !== counter.periodValue) {
        refunded[counterKey(counter)] = 0;
        continue;
      }

      const restored = Math.max(0, (Number(data[counter.field]) || 0) - counter.delta);
      tx.set(counter.ref, { [counter.field]: restored }, { merge: true });
      refunded[counterKey(counter)] = restored;
    }

    return refunded;
  });
}

/**
 * Runs a metered paid call: reserve, spend, refund on failure.
 *
 * `onReserved` receives `(committed, tierData)` right after the reservation, so
 * callers can log what was charged and resolve tier-dependent limits without a
 * second read.
 *
 * Pairing the two here is deliberate. A reserve that can be called without a
 * matching refund is how these systems start overcharging users on transient
 * upstream failures, so there is no way to reserve without one.
 */
async function runMeteredCall(db, spec, spend, onReserved) {
  const { committed, tierData } = await reserveQuota(db, spec);
  if (onReserved) onReserved(committed, tierData);

  let result;
  try {
    result = await spend();
  } catch (error) {
    try {
      await refundQuota(db, spec);
    } catch (refundError) {
      // The reservation is now stranded. Log loudly, but never replace the
      // original failure: that error is what the caller has to act on.
      console.error("[meteredQuota] refund failed after a failed metered call", {
        message: error && error.message,
        refundError: refundError && refundError.message,
        counters: spec.counters.map((c) => c.ref.path),
      });
    }
    throw error;
  }

  return result;
}

module.exports = { reserveQuota, refundQuota, runMeteredCall, snapshotNumber };