import { Authorizer } from '../lib'
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers'

const authorizerConfig = {
  authorizerURL: 'http://localhost:8080',
  redirectURL: 'http://localhost:8080/app',
  clientID: '3fab5e58-5693-46f2-8123-83db8133cd22',
  adminSecret: 'secret',
  // debug: true
}

const testConfig = {
  email: 'test@test.com',
  webHookId: '',
  webHookUrl: 'https://webhook.site/c28a87c1-f061-44e0-9f7a-508bc554576f',
  userId: '',
  emailTemplateId: '',
}

// Using etheral.email for email sink: https://ethereal.email/create
const authorizerENV = {
  ENV: 'production',
  DATABASE_URL: 'data.db',
  DATABASE_TYPE: 'sqlite',
  CUSTOM_ACCESS_TOKEN_SCRIPT: "function(user,tokenPayload){var data = tokenPayload;data.extra = {'x-extra-id': user.id};return data;}",
  DISABLE_PLAYGROUND: 'true',
  SMTP_HOST: 'smtp.ethereal.email',
  SMTP_PASSWORD: 'WncNxwVFqb6nBjKDQJ',
  SMTP_USERNAME: 'sydnee.lesch77@ethereal.email',
  SMTP_PORT:'587',
  SENDER_EMAIL: 'test@authorize.com',
}

describe('INTEGRATION / Authorizer-js-admin', () => {
  let container: StartedTestContainer

  let authorizer: Authorizer

  beforeAll(async () => {
    container = await new GenericContainer('lakhansamani/authorizer:latest')
      .withEnvironment(authorizerENV)
      .withExposedPorts(8080)
      .withWaitStrategy(Wait.forHttp("/userinfo", 8080)
      .forStatusCode(401))
      .start()

    authorizerConfig.authorizerURL = `http://${container.getHost()}:${container.getFirstMappedPort()}`
    authorizerConfig.redirectURL = `http://${container.getHost()}:${container.getFirstMappedPort()}/app`

    authorizer = new Authorizer(authorizerConfig)
  })

  /*afterAll(
    async () => await container.stop()
  )*/

  it('should perform admin signup', async () => {
    const adminSignupData = await authorizer._admin_signup(
      authorizerConfig.adminSecret
    )
    expect(adminSignupData.data).toBeDefined()
    expect(adminSignupData.errors).toHaveLength(0)
  })

  it('should handle errors during admin signup', async () => {
    const adminSignupData = await authorizer._admin_signup(
      authorizerConfig.adminSecret
    )
    expect(adminSignupData.errors).toBeDefined()
  })

  it('should initialize with valid config', () => {
    expect(() => {
      new Authorizer(authorizerConfig)
    }).not.toThrow()
  })

  it('should invite members', async () => {
    const inviteMembersData = await authorizer._invite_members({
      emails: [testConfig.email],
      redirect_uri: authorizerConfig.redirectURL,
    })
    expect(inviteMembersData.data).toBeDefined()
    expect(inviteMembersData.errors).toHaveLength(0)
  })

  it('should get user information', async () => {
    const userData = await authorizer._user({ email: testConfig.email })
    testConfig.userId = userData.data!.id
    expect(userData.data).toBeDefined()
    expect(userData.errors).toHaveLength(0)
  })

  it('should get users', async () => {
    const usersData = await authorizer._users({ page: 1 })
    expect(usersData.data).toBeDefined()
    expect(usersData.errors).toHaveLength(0)
  })

  it('should get verification requests', async () => {
    const verificationData = await authorizer._verification_requests({
      page: 1,
    })
    expect(verificationData.data).toBeDefined()
    expect(verificationData.errors).toHaveLength(0)
  })

  it('should get admin session', async () => {
    const adminSessionData = await authorizer._admin_session()
    expect(adminSessionData.data).toBeDefined()
    expect(adminSessionData.errors).toHaveLength(0)
  })

  it('should get environment variables', async () => {
    const envData = await authorizer._env(['ADMIN_SECRET'])
    expect(envData.data).toBeDefined()
    expect(envData.errors).toHaveLength(0)
  })

  it('should get webhook logs', async () => {
    const webhookLogsData = await authorizer._webhook_logs({
      webhook_id: testConfig.webHookId,
    })
    expect(webhookLogsData.data).toBeDefined()
    expect(webhookLogsData.errors).toHaveLength(0)
  })

  it('should perform admin login', async () => {
    const adminLoginData = await authorizer._admin_login(
      authorizerConfig.adminSecret
    )
    expect(adminLoginData.data).toBeDefined()
    expect(adminLoginData.errors).toHaveLength(0)
  })

  it('should handle errors during admin login', async () => {
    const adminLoginData = await authorizer._admin_login(
      authorizerConfig.adminSecret
    )
    expect(adminLoginData.errors).toBeDefined()
  })

  it('should perform admin logout', async () => {
    const adminLogoutData = await authorizer._admin_logout()
    expect(adminLogoutData.data).toBeDefined()
    expect(adminLogoutData.errors).toHaveLength(0)
  })

  it('should handle errors during admin logout', async () => {
    const adminLogoutData = await authorizer._admin_logout()
    expect(adminLogoutData.errors).toBeDefined()
  })

  it('should update environment variables', async () => {
    const updateEnvData = await authorizer._update_env({
      SENDER_NAME: 'SIIM SAMS',
    })
    expect(updateEnvData.data).toBeDefined()
    expect(updateEnvData.errors).toHaveLength(0)
  })

  it('should update user information', async () => {
    const updateUserData = await authorizer._update_user({
      given_name: 'aaaa',
      id: testConfig.userId,
    })
    expect(updateUserData.data).toBeDefined()
    expect(updateUserData.errors).toHaveLength(0)
  })

  it('should generate JWT keys', async () => {
    const jwtKeysData = await authorizer._generate_jwt_keys({ type: 'HS256' })
    expect(jwtKeysData.data).toBeDefined()
    expect(jwtKeysData.errors).toHaveLength(0)
  })

  it('should test an endpoint', async () => {
    const testEndpointData = await authorizer._test_endpoint({
      event_name: 'user.login',
      endpoint: testConfig.webHookUrl,
      headers: { Authorization: 'Basic test' },
    })
    expect(testEndpointData.data).toBeDefined()
    expect(testEndpointData.errors).toHaveLength(0)
  })

  it('should add a webhook', async () => {
    const addWebhookData = await authorizer._add_webhook({
      event_name: 'user.login',
      endpoint: testConfig.webHookUrl,
      enabled: true,
      headers: { Authorization: 'Basic test' },
    })
    expect(addWebhookData.data).toBeDefined()
    expect(addWebhookData.errors).toHaveLength(0)
  })

  it('should get webhooks', async () => {
    const webhooksData = await authorizer._webhooks({ page: 1 })
    testConfig.webHookId = webhooksData.data!.webhooks[0].id
    expect(webhooksData.data!.webhooks[0]).toBeDefined()
    expect(webhooksData.errors).toHaveLength(0)
  })

  it('should get webhook', async () => {
    const webhookData = await authorizer._webhook({ id: testConfig.webHookId })
    expect(webhookData.data).toBeDefined()
    expect(webhookData.errors).toHaveLength(0)
  })

  it('should update a webhook', async () => {
    const updateWebhookData = await authorizer._update_webhook({
      id: testConfig.webHookId,
      event_description: 'testing',
    })
    expect(updateWebhookData.data).toBeDefined()
    expect(updateWebhookData.errors).toHaveLength(0)
  })

  it('should delete a webhook', async () => {
    const deleteWebhookData = await authorizer._delete_webhook(
      testConfig.webHookId
    )
    expect(deleteWebhookData.data).toBeDefined()
    expect(deleteWebhookData.errors).toHaveLength(0)
  })

  it('should add an email template', async () => {
    const addEmailTemplateData = await authorizer._add_email_template({
      event_name: 'magic_link_login',
      subject: 'template',
      template: 'boiii',
      design: '',
    })
    expect(addEmailTemplateData.data).toBeDefined()
    expect(addEmailTemplateData.errors).toHaveLength(0)
  })

  it('should get email templates', async () => {
    const emailTemplatesData = await authorizer._email_templates({ page: 1 })
    testConfig.emailTemplateId = emailTemplatesData.data!.email_templates[0].id
    expect(emailTemplatesData.data).toBeDefined()
    expect(emailTemplatesData.errors).toHaveLength(0)
  })

  it('should update an email template', async () => {
    const updateEmailTemplateData = await authorizer._update_email_template({
      event_name: 'magic_link_login',
      subject: 'template',
      template: 'boiii',
      design: '',
      id: testConfig.emailTemplateId,
    })
    expect(updateEmailTemplateData.data).toBeDefined()
    expect(updateEmailTemplateData.errors).toHaveLength(0)
  })

  it('should delete an email template', async () => {
    const deleteEmailTemplateData = await authorizer._delete_email_template(
      testConfig.emailTemplateId
    )
    expect(deleteEmailTemplateData.data).toBeDefined()
    expect(deleteEmailTemplateData.errors).toHaveLength(0)
  })

  it('should revoke access', async () => {
    const revokeAccessData = await authorizer._revoke_access(testConfig.userId)
    expect(revokeAccessData.data).toBeDefined()
    expect(revokeAccessData.errors).toHaveLength(0)
  })

  it('should enable access', async () => {
    const enableAccessData = await authorizer._enable_access(testConfig.userId)
    expect(enableAccessData.data).toBeDefined()
    expect(enableAccessData.errors).toHaveLength(0)
  })

  it('should delete a user', async () => {
    const deleteUserData = await authorizer._delete_user(testConfig.email)
    expect(deleteUserData.data).toBeDefined()
    expect(deleteUserData.errors).toHaveLength(0)
  })
})
