/**
 * Append-only membership audit events (shared to avoid service circular imports).
 * @param {import('pg').PoolClient} client
 * @param {{ businessId: string; membershipId: string; eventType: string; metadata?: object }} params
 */
export async function recordMembershipEvent(client, { businessId, membershipId, eventType, metadata = {} }) {
  await client.query(
    `INSERT INTO membership_events (business_id, membership_id, event_type, metadata)
     VALUES ($1::uuid, $2::uuid, $3, $4::jsonb)`,
    [businessId, membershipId, eventType, JSON.stringify(metadata)]
  );
}
