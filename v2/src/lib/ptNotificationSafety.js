// PT enquiries are business-critical: an open request must appear in the
// staff inbox even if the notifications table lacks a matching open row.
// This is a read-only fallback; only handling the request closes it.
export function missingPtLeadAlerts(leads = [], notifications = []) {
  const protectedIds = new Set(notifications
    .filter(item => item.href?.startsWith('pt-service-request:')
      && item.status === 'open' && !item.archived_at)
    .map(item => item.href.slice('pt-service-request:'.length)))

  return leads.filter(row => ['pending', 'reviewing'].includes(row.status)
    && !protectedIds.has(row.id)).map(row => ({
    id: 'pending-pt-' + row.id,
    virtualPTLead: true,
    title: 'PT-førespurnad ventar på oppfølging',
    body: (row.service_title || 'PT-oppfølging') + ' · Opna bestillinga og følg opp kunden.',
    category: 'pt',
    href: 'pt-service-request:' + row.id,
    priority: 'high',
    requires_action: true,
    requires_ack: false,
    is_read: false,
    status: 'open',
    created_at: row.created_at,
  }))
}
