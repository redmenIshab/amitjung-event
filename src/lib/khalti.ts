// Khalti e-payment API base URL.
//
// - Sandbox/test: https://dev.khalti.com  → requires a TEST secret key
//   (from the test merchant dashboard at test-admin.khalti.com / dev.khalti.com).
// - Live/prod:    https://khalti.com       → requires a LIVE secret key.
//
// The base MUST match the type of KHALTI_SECRET_KEY. A live key against the
// sandbox base (or vice-versa) makes Khalti reject the request with
// `{"detail":"Invalid token."}`. Set KHALTI_BASE_URL=https://khalti.com in
// production alongside your live secret key.
export const KHALTI_BASE_URL = process.env.KHALTI_BASE_URL ?? 'https://dev.khalti.com'
