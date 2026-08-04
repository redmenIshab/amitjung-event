import { requirePageCapability } from '@/lib/rbac'
import { NewUserForm } from '@/components/dashboard/NewUserForm'

export default async function NewUserPage() {
  await requirePageCapability('USER_MANAGE')
  // Drives the fallback copy: with mail off, the password is shown for copying.
  return <NewUserForm emailEnabled={process.env.ENABLE_EMAIL === 'true'} />
}
