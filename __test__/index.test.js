const { Authorizer } = require('../lib')

describe('Authorizer-js-admin', () => {
  let authorizer;

  beforeAll(() => {
    authorizer = new Authorizer({
      authorizerURL: 'http://localhost',
      redirectURL: 'http://localhost/app',
      clientID: '3fab5e58-5693-46f2-8123-83db8133cd22',
      adminSecret: 'admin'
    });
  });

  it('should initialize with valid config', () => {
    expect(() => {
      new Authorizer({
        authorizerURL: 'http://localhost',
        redirectURL: 'http://localhost/app',
        clientID: '3fab5e58-5693-46f2-8123-83db8133cd22',
        adminSecret: 'admin'
      });
    }).not.toThrow();
  });

  it('should throw an error when initialized with invalid config', () => {
    expect(() => {
      new Authorizer();
    }).toThrow('Configuration is required');
  });

  it('should get user information', async () => {
    const userData = await authorizer._user({email: 'test@gmail.com'});
    expect(userData.data).toBeDefined();
    expect(userData.errors).toHaveLength(0);
  });

  it('should handle errors when getting user information', async () => {
    const userData = await authorizer._user();
    expect(userData.errors).toHaveLength(1);
  });

  it('should get users', async () => {
    const usersData = await authorizer._users({page: 1});
    expect(usersData.data).toBeDefined();
    expect(usersData.errors).toHaveLength(0);
  });

  it('should handle errors when getting users', async () => {
    const usersData = await authorizer._users();
    expect(usersData.errors).toHaveLength(1);
  });

  it('should get verification requests', async () => {
    const verificationData = await authorizer._verification_requests({page: 1});
    expect(verificationData.data).toBeDefined();
    expect(verificationData.errors).toHaveLength(0);
  });

  it('should handle errors when getting verification requests', async () => {
    const verificationData = await authorizer._verification_requests();
    expect(verificationData.errors).toHaveLength(1);
  });

  it('should get admin session', async () => {
    const adminSessionData = await authorizer._admin_session();
    expect(adminSessionDat.data).toBeDefined();
    expect(adminSessionData.errors).toHaveLength(0);
  });

  it('should get environment variables', async () => {
    const envData = await authorizer._env(['ADMIN_SECRET']);
    expect(envData.data).toBeDefined();
    expect(envData.errors).toHaveLength(0);
  });

  it('should handle errors when getting environment variables', async () => {
    const envData = await authorizer._env(['field1', 'field2']);
    expect(envData.errors).toHaveLength(1);
  });

  it('should get webhook', async () => {
    const webhookData = await authorizer._webhook({id: '509b8be6-1fbb-4f32-827a-b24d1fe019a4'});
    expect(webhookData.data).toBeDefined();
    expect(webhookData.errors).toHaveLength(0);
  });

  it('should handle errors when getting webhook', async () => {
    expect(webhookData.errors).toHaveLength(1);
  });

  it('should get webhooks', async () => {
    const webhooksData = await authorizer._webhooks({page: 1});
    expect(webhooksData.data).toBeDefined();
    expect(webhooksData.errors).toHaveLength(0);
  });

  it('should handle errors when getting webhooks', async () => {
    const webhooksData = await authorizer._webhooks({ /* PaginatedInput data */ });
    expect(webhooksData.errors).toHaveLength(1);
  });

  it('should get webhook logs', async () => {
    const webhookLogsData = await authorizer._webhook_logs({webhook_id: '509b8be6-1fbb-4f32-827a-b24d1fe019a4'});
    expect(webhookLogsData.data).toBeDefined();
    expect(webhookLogsData.errors).toHaveLength(0);
  });

  it('should handle errors when getting webhook logs', async () => {
    const webhookLogsData = await authorizer._webhook_logs();
    expect(webhookLogsData.errors).toHaveLength(1);
  });

  it('should get email templates', async () => {
    const emailTemplatesData = await authorizer._email_templates({ /* PaginatedInput data */ });
    expect(emailTemplatesData).toBeDefined();
    expect(emailTemplatesData.errors).toHaveLength(0);
  });

  it('should handle errors when getting email templates', async () => {
    const emailTemplatesData = await authorizer._email_templates({ /* PaginatedInput data */ });
    expect(emailTemplatesData).toBeDefined();
    expect(emailTemplatesData.errors).toHaveLength(1);
  });

  it('should perform admin signup', async () => {
    const adminSignupData = await authorizer._admin_signup({ admin_secret: 'admin' });
    expect(adminSignupData).toBeDefined();
    expect(adminSignupData.errors).toHaveLength(0);
  });

  it('should handle errors during admin signup', async () => {
    const adminSignupData = await authorizer._admin_signup({ admin_secret: 'admin' });
    expect(adminSignupData).toBeDefined();
    expect(adminSignupData.errors).toHaveLength(1);
  });

  it('should perform admin login', async () => {
    const adminLoginData = await authorizer._admin_login({ admin_secret: 'admin' });
    expect(adminLoginData).toBeDefined();
    expect(adminLoginData.errors).toHaveLength(0);
  });

  it('should handle errors during admin login', async () => {
    const adminLoginData = await authorizer._admin_login({ admin_secret: 'admin' });
    expect(adminLoginData).toBeDefined();
    expect(adminLoginData.errors).toHaveLength(1);
  });

  it('should perform admin logout', async () => {
    const adminLogoutData = await authorizer._admin_logout();
    expect(adminLogoutData).toBeDefined();
    expect(adminLogoutData.errors).toHaveLength(0);
  });

  it('should handle errors during admin logout', async () => {
    const adminLogoutData = await authorizer._admin_logout();
    expect(adminLogoutData).toBeDefined();
    expect(adminLogoutData.errors).toHaveLength(1);
  });

  it('should update environment variables', async () => {
    const updateEnvData = await authorizer._update_env({ /* Env data */ });
    expect(updateEnvData).toBeDefined();
    expect(updateEnvData.errors).toHaveLength(0);
  });

  it('should handle errors when updating environment variables', async () => {
    const updateEnvData = await authorizer._update_env({ /* Env data */ });
    expect(updateEnvData).toBeDefined();
    expect(updateEnvData.errors).toHaveLength(1);
  });

  it('should update user information', async () => {
    const updateUserData = await authorizer._update_user({ /* UpdateUserInput data */ });
    expect(updateUserData).toBeDefined();
    expect(updateUserData.errors).toHaveLength(0);
  });

  it('should handle errors when updating user information', async () => {
    const updateUserData = await authorizer._update_user({ /* UpdateUserInput data */ });
    expect(updateUserData).toBeDefined();
    expect(updateUserData.errors).toHaveLength(1);
  });

  it('should delete a user', async () => {
    const deleteUserData = await authorizer._delete_user({ email: 'user@example.com' });
    expect(deleteUserData).toBeDefined();
    expect(deleteUserData.errors).toHaveLength(0);
  });

  it('should handle errors when deleting a user', async () => {
    const deleteUserData = await authorizer._delete_user({ email: 'user@example.com' });
    expect(deleteUserData).toBeDefined();
    expect(deleteUserData.errors).toHaveLength(1);
  });

  it('should invite members', async () => {
    const inviteMembersData = await authorizer._invite_members({ /* InviteMemberInput data */ });
    expect(inviteMembersData).toBeDefined();
    expect(inviteMembersData.errors).toHaveLength(0);
  });

  it('should handle errors when inviting members', async () => {
    const inviteMembersData = await authorizer._invite_members({ /* InviteMemberInput data */ });
    expect(inviteMembersData).toBeDefined();
    expect(inviteMembersData.errors).toHaveLength(1);
  });

  it('should revoke access', async () => {
    const revokeAccessData = await authorizer._revoke_access({ user_id: '123' });
    expect(revokeAccessData).toBeDefined();
    expect(revokeAccessData.errors).toHaveLength(0);
  });

  it('should handle errors when revoking access', async () => {
    const revokeAccessData = await authorizer._revoke_access({ user_id: '123' });
    expect(revokeAccessData).toBeDefined();
    expect(revokeAccessData.errors).toHaveLength(1);
  });

  it('should enable access', async () => {
    const enableAccessData = await authorizer._enable_access({ user_id: '123' });
    expect(enableAccessData).toBeDefined();
    expect(enableAccessData.errors).toHaveLength(0);
  });

  it('should handle errors when enabling access', async () => {
    const enableAccessData = await authorizer._enable_access({ user_id: '123' });
    expect(enableAccessData).toBeDefined();
    expect(enableAccessData.errors).toHaveLength(1);
  });

  it('should generate JWT keys', async () => {
    const jwtKeysData = await authorizer._generate_jwt_keys({ /* GenerateJWTKeysInput data */ });
    expect(jwtKeysData).toBeDefined();
    expect(jwtKeysData.errors).toHaveLength(0);
  });

  it('should handle errors when generating JWT keys', async () => {
    const jwtKeysData = await authorizer._generate_jwt_keys({ /* GenerateJWTKeysInput data */ });
    expect(jwtKeysData).toBeDefined();
    expect(jwtKeysData.errors).toHaveLength(1);
  });

  it('should test an endpoint', async () => {
    const testEndpointData = await authorizer._test_endpoint({ /* TestEndpointInput data */ });
    expect(testEndpointData).toBeDefined();
    expect(testEndpointData.errors).toHaveLength(0);
  });

  it('should handle errors when testing an endpoint', async () => {
    const testEndpointData = await authorizer._test_endpoint({ /* TestEndpointInput data */ });
    expect(testEndpointData).toBeDefined();
    expect(testEndpointData.errors).toHaveLength(1);
  });

  it('should add a webhook', async () => {
    const addWebhookData = await authorizer._add_webhook({ /* AddWebhookInput data */ });
    expect(addWebhookData).toBeDefined();
    expect(addWebhookData.errors).toHaveLength(0);
  });

  it('should handle errors when adding a webhook', async () => {
    const addWebhookData = await authorizer._add_webhook({ /* AddWebhookInput data */ });
    expect(addWebhookData).toBeDefined();
    expect(addWebhookData.errors).toHaveLength(1);
  });

  it('should update a webhook', async () => {
    const updateWebhookData = await authorizer._update_webhook({ /* UpdateWebhookInput data */ });
    expect(updateWebhookData).toBeDefined();
    expect(updateWebhookData.errors).toHaveLength(0);
  });

  it('should handle errors when updating a webhook', async () => {
    const updateWebhookData = await authorizer._update_webhook({ /* UpdateWebhookInput data */ });
    expect(updateWebhookData).toBeDefined();
    expect(updateWebhookData.errors).toHaveLength(1);
  });

  it('should delete a webhook', async () => {
    const deleteWebhookData = await authorizer._delete_webhook({ /* IdInput data */ });
    expect(deleteWebhookData).toBeDefined();
    expect(deleteWebhookData.errors).toHaveLength(0);
  });

  it('should handle errors when deleting a webhook', async () => {
    const deleteWebhookData = await authorizer._delete_webhook({ /* IdInput data */ });
    expect(deleteWebhookData).toBeDefined();
    expect(deleteWebhookData.errors).toHaveLength(1);
  });

  it('should add an email template', async () => {
    const addEmailTemplateData = await authorizer._add_email_template({ /* AddEmailTemplateInput data */ });
    expect(addEmailTemplateData).toBeDefined();
    expect(addEmailTemplateData.errors).toHaveLength(0);
  });

  it('should handle errors when adding an email template', async () => {
    const addEmailTemplateData = await authorizer._add_email_template({ /* AddEmailTemplateInput data */ });
    expect(addEmailTemplateData).toBeDefined();
    expect(addEmailTemplateData.errors).toHaveLength(1);
  });

  it('should update an email template', async () => {
    const updateEmailTemplateData = await authorizer._update_email_template({ /* UpdateEmailTemplateInput data */ });
    expect(updateEmailTemplateData).toBeDefined();
    expect(updateEmailTemplateData.errors).toHaveLength(0);
  });

  it('should handle errors when updating an email template', async () => {
    const updateEmailTemplateData = await authorizer._update_email_template({ /* UpdateEmailTemplateInput data */ });
    expect(updateEmailTemplateData).toBeDefined();
    expect(updateEmailTemplateData.errors).toHaveLength(1);
  });

  it('should delete an email template', async () => {
    const deleteEmailTemplateData = await authorizer._delete_email_template({ /* IdInput data */ });
    expect(deleteEmailTemplateData).toBeDefined();
    expect(deleteEmailTemplateData.errors).toHaveLength(0);
  });

  it('should handle errors when deleting an email template', async () => {
    const deleteEmailTemplateData = await authorizer._delete_email_template({ /* IdInput data */ });
    expect(deleteEmailTemplateData).toBeDefined();
    expect(deleteEmailTemplateData.errors).toHaveLength(1);
  });
});
