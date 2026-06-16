import { redirect } from 'next/navigation'

type Props = { params: Promise<{ token: string }> }

// Old QR codes pointed to /verify/[token] — redirect to the new public ticket page.
export default async function VerifyRedirectPage({ params }: Props) {
  const { token } = await params
  redirect(`/ticket/${token}`)
}
