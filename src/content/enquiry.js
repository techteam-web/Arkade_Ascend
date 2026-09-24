// Enquiry delivery. Set VITE_ENQUIRY_ENDPOINT (a CRM or form webhook that
// accepts JSON) to send enquiries. Without it, enquiries are queued on this
// device under STORAGE_KEY so none are lost at a sales-gallery kiosk; export
// and clear that queue regularly, since it holds visitors' contact details.
const endpoint = import.meta.env.VITE_ENQUIRY_ENDPOINT
export const STORAGE_KEY = 'arkade-ascend-enquiries'

export async function submitEnquiry(details) {
  const record = { ...details, project: 'Arkade Ascend, Malad West', submittedAt: new Date().toISOString() }
  if (endpoint) {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record) })
    if (!response.ok) throw new Error(`The enquiry could not be sent (${response.status}).`)
    return { delivered: true }
  }
  try {
    const queue = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    queue.push(record)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
  } catch {
    throw new Error('The enquiry could not be saved on this device.')
  }
  return { delivered: false }
}
