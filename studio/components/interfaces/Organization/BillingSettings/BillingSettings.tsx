import Link from 'next/link'
import toast from 'react-hot-toast'
import { useRouter } from 'next/router'
import { FC, useState, useEffect } from 'react'
import { Typography, Badge, Button, IconTrash, IconCreditCard } from '@supabase/ui'

import { API_URL } from 'lib/constants'
import { getURL } from 'lib/helpers'
import { post } from 'lib/common/fetch'
import Panel from 'components/to-be-cleaned/Panel'
import ProjectSubscription from './ProjectSubscription'

interface Props {
  organization: any
  projects: any[]
}

const BillingSettings: FC<Props> = ({ organization, projects = [] }) => {
  const router = useRouter()

  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<any>(undefined)
  const [customer, setCustomer] = useState<any>(null)
  const [paymentMethods, setPaymentMethods] = useState<any>(null)

  const { stripe_customer_id, name: orgName, slug: orgSlug } = organization

  const customerBalance = customer && customer.balance ? customer.balance / 100 : 0
  const isCredit = customerBalance < 0
  const isDebt = customerBalance > 0
  const balance =
    isCredit && customerBalance !== 0
      ? customerBalance.toString().replace('-', '')
      : customerBalance

  useEffect(() => {
    if (stripe_customer_id) {
      getStripeAccount()
    }
  }, [stripe_customer_id])

  /**
   * Get stripe account to populate page
   */
  const getStripeAccount = async () => {
    try {
      setLoading(true)
      setError(null)
      const { paymentMethods, customer, error } = await post(`${API_URL}/stripe/customer`, {
        stripe_customer_id: stripe_customer_id,
      })
      if (error) throw error
      setPaymentMethods(paymentMethods)
      setCustomer(customer)
    } catch (error: any) {
      toast.error(error.message)
      setError(error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Get a link and then redirect them
   * path is used to determine what path inside billing portal to redirect to
   */
  const redirectToPortal = async (path: any) => {
    try {
      setLoading(true)
      let { billingPortal } = await post(`${API_URL}/stripe/billing`, {
        stripe_customer_id,
        returnTo: `${getURL()}${router.asPath}`,
      })
      window.location.replace(billingPortal + (path ? path : null))
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <article className="my-4 container max-w-4xl space-y-8">
      {organization.aws_marketplace ? (
        <div className="flex flex-col space-y-4">
          <Typography.Text>
            This organization is subscribed via AWS Marketplace, with a limit of{' '}
            {organization.project_limit} projects and expiring on{' '}
            {organization.aws_marketplace.Entitlements[0].ExpirationDate.slice(0, 10)}.
          </Typography.Text>

          <Button>
            <a
              href="https://aws.amazon.com/marketplace/saas/ordering?productId=dc498450-cecf-44c2-8c99-c3c13f16e70a&offerId=d1htt16t3ygx5brtwhooms0ei"
              target="_blank"
            >
              Manage AWS Marketplace subscription
            </a>
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-12 gap-12">
            <div className="col-span-12 lg:col-span-6">
              <Panel
                loading={loading}
                title={[
                  <Typography.Title key="panel-title" className="block" level={4}>
                    Balance
                  </Typography.Title>,
                ]}
              >
                <Panel.Content>
                  {isCredit && <Badge>You have credits available</Badge>}
                  {isDebt && <Badge color="red">Outstanding payments</Badge>}

                  <Typography.Title level={2} className="mb-0">
                    <Typography.Text type="secondary">
                      <span className="text-lg font-normal">$</span>
                    </Typography.Text>

                    <span>{balance}</span>
                    <Typography.Text type="secondary">
                      {isCredit && <span className="text-lg font-normal"> / credits</span>}
                    </Typography.Text>
                  </Typography.Title>
                </Panel.Content>
              </Panel>
            </div>
            <div className="col-span-12 lg:col-span-6">
              <Panel
                loading={loading}
                title={[
                  <Typography.Title key="panel-title" className="block" level={4}>
                    Payment methods
                  </Typography.Title>,
                ]}
                footer={[
                  <Button
                    key="panel-footer"
                    type="outline"
                    onClick={() => redirectToPortal('/payment-methods')}
                  >
                    {paymentMethods ? 'Add another payment method' : 'Add a payment method'}
                  </Button>,
                ]}
              >
                <Panel.Content>
                  {paymentMethods && paymentMethods.data.length >= 1 ? (
                    <div className="space-y-1">
                      {paymentMethods.data.map((paymentMethod: any) => {
                        return (
                          <div
                            key={paymentMethod.id}
                            className="rounded border border-border-secondary-light dark:border-border-secondary-dark p-3 flex items-center justify-between"
                          >
                            <div className="flex items-center space-x-4">
                              <img
                                src={`/img/payment-methods/${paymentMethod.card.brand
                                  .replace(' ', '-')
                                  .toLowerCase()}.png`}
                                width="32"
                              />
                              <Typography.Text>
                                <span className="capitalize">{paymentMethod.card.brand}</span>{' '}
                                ending in{' '}
                                <span className="dark:text-white">{paymentMethod.card.last4}</span>
                              </Typography.Text>
                            </div>
                            <div>
                              <Typography.Text>
                                <span className="dark:text-white">
                                  {paymentMethod.card.exp_month}
                                </span>
                                /
                                <span className="dark:text-white">
                                  {paymentMethod.card.exp_year}
                                </span>
                              </Typography.Text>
                            </div>
                            <Button
                              type="outline"
                              icon={<IconTrash />}
                              onClick={() => redirectToPortal('/')}
                            >
                              Edit
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-4 flex items-center rounded border border-border-secondary-light dark:border-border-secondary-dark border-dashed">
                      <div className="flex items-center w-full justify-between space-x-2 hover:text-white hover:border-white">
                        <Typography.Text className="flex items-center space-x-2">
                          <div>
                            <IconCreditCard />
                          </div>
                          <div>No payment methods</div>
                        </Typography.Text>
                      </div>
                    </div>
                  )}
                </Panel.Content>
                <div className="flex items-center w-full justify-between space-x-2 hover:text-white hover:border-white"></div>
              </Panel>
            </div>
          </div>
          <div>
            {projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-16 py-12 border border-border-secondary-light dark:border-border-secondary-dark border-dashed rounded space-y-3">
                <Typography.Text className="block" type="secondary">
                  You have no projects in organization {orgName} yet
                </Typography.Text>
                <div>
                  <Link href={`/new/${orgSlug}`}>
                    <Button type="outline">Create a project</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <Typography.Text className="block mb-4">Projects in organization</Typography.Text>
            )}
            <div className="space-y-8">
              {projects.map((project) => {
                return <ProjectSubscription key={project.id} project={project} />
              })}
            </div>
          </div>
        </>
      )}
    </article>
  )
}

export default BillingSettings
