import crossFetch from 'cross-fetch'
import { DEFAULT_AUTHORIZE_TIMEOUT_IN_SECONDS } from './constants'
import * as Types from './types'
import {
  bufferToBase64UrlEncoded,
  createQueryParams,
  createRandomString,
  encode,
  executeIframe,
  hasWindow,
  sha256,
  trimURL,
} from './utils'
import {
  ResponseTypes,
  type AddEmailTemplateInput,
  type AddWebhookInput,
  type ApiResponse,
  type AuthorizeResponse,
  type ConfigType,
  type EmailTemplateResponse,
  type Env,
  type GenerateJWTKeysInput,
  type GenerateJWTKeysResponse,
  type GenericResponse,
  type GetTokenResponse,
  type GrapQlResponseType,
  type IdInput,
  type InviteMemberInput,
  type PaginatedInput,
  type PaginationResponse,
  type ServerConfigInput,
  type ServerConfigResponse,
  type TestEndpointInput,
  type TestEndpointResponse,
  type UpdateEmailTemplateInput,
  type UpdateUserInput,
  type UpdateWebhookInput,
  type User,
  type UserInput,
  type VerificationResponse,
  type WebhookLogInput,
  type WebhookLogResponse,
  type WebhookResponse,
  GraphqlQueryInput,
} from './types'

// re-usable gql response fragment
const userFragment =
  'id email email_verified given_name family_name middle_name nickname preferred_username picture signup_methods gender birthdate phone_number phone_number_verified roles created_at updated_at is_multi_factor_auth_enabled app_data'

// set fetch based on window object. Cross fetch have issues with umd build
const getFetcher = () => (hasWindow() ? window.fetch : crossFetch)

export * from './types'

export class Authorizer {
  // class variable
  config: ConfigType
  codeVerifier: string

  // constructor
  constructor(config: ConfigType) {
    if (!config) throw new Error('Configuration is required')

    this.config = config
    if (!config.authorizerURL && !config.authorizerURL.trim())
      throw new Error('Invalid authorizerURL')

    if (config.authorizerURL)
      this.config.authorizerURL = trimURL(config.authorizerURL)

    if (!config.redirectURL && !config.redirectURL.trim())
      throw new Error('Invalid redirectURL')
    else this.config.redirectURL = trimURL(config.redirectURL)

    this.config.extraHeaders = {
      ...(config.extraHeaders || {}),
      'x-authorizer-url': this.config.authorizerURL,
      'Content-Type': 'application/json',
    }
    this.config.clientID = config.clientID.trim()
  }

  authorize = async (
    data: Types.AuthorizeInput
  ): Promise<
    ApiResponse<GetTokenResponse> | ApiResponse<AuthorizeResponse>
  > => {
    if (!hasWindow())
      return this.errorResponse([
        new Error('this feature is only supported in browser'),
      ])

    const scopes = ['openid', 'profile', 'email']
    if (data.use_refresh_token) scopes.push('offline_access')

    const requestData: Record<string, string> = {
      redirect_uri: this.config.redirectURL,
      response_mode: data.response_mode || 'web_message',
      state: encode(createRandomString()),
      nonce: encode(createRandomString()),
      response_type: data.response_type,
      scope: scopes.join(' '),
      client_id: this.config.clientID,
    }

    if (data.response_type === ResponseTypes.Code) {
      this.codeVerifier = createRandomString()
      const sha = await sha256(this.codeVerifier)
      const codeChallenge = bufferToBase64UrlEncoded(sha)
      requestData.code_challenge = codeChallenge
    }

    const authorizeURL = `${
      this.config.authorizerURL
    }/authorize?${createQueryParams(requestData)}`

    if (requestData.response_mode !== 'web_message') {
      window.location.replace(authorizeURL)
      return this.okResponse(undefined)
    }

    try {
      const iframeRes = await executeIframe(
        authorizeURL,
        this.config.authorizerURL,
        DEFAULT_AUTHORIZE_TIMEOUT_IN_SECONDS
      )

      return this.okResponse(iframeRes)
    } catch (err) {
      if (err.error) {
        window.location.replace(
          `${this.config.authorizerURL}/app?state=${encode(
            JSON.stringify(this.config)
          )}&redirect_uri=${this.config.redirectURL}`
        )
      }

      return this.errorResponse(err)
    }
  }

  _user = async (data?: UserInput): Promise<ApiResponse<User>> => {
    try {
      const res = await this.graphqlQuery({
        query: `query {	_user( params: $data) { ${userFragment} } }`,
        variables: { data },
      })

      return res?.errors?.length
        ? this.errorResponse(res.errors)
        : this.okResponse(res.data?._user)
    } catch (error) {
      return this.errorResponse([error])
    }
  }

  _users = async (
    data?: PaginatedInput
  ): Promise<
    ApiResponse<{ pagination: PaginationResponse; users: User[] }>
  > => {
    try {
      const res = await this.graphqlQuery({
        query: `query {	_users(params: {
          pagination: $data
        }) {
          pagination: {
            offset
            total
            page
            limit
          }
          users {
            ${userFragment}
          }
        }`,
        variables: { data },
      })

      return res?.errors?.length
        ? this.errorResponse(res.errors)
        : this.okResponse(res.data)
    } catch (error) {
      return this.errorResponse([error])
    }
  }

  _verification_requests = async (
    data?: PaginatedInput
  ): Promise<
    ApiResponse<{
      pagination: PaginationResponse
      verification_requests: VerificationResponse[]
    }>
  > => {
    try {
      const res = await this.graphqlQuery({
        query: `query {	_verification_requests(params: {
          pagination: $data
        }) {
          pagination: {
            offset
            total
            page
            limit
          }
          verification_requests {
            id
            token
            email
            expires
            identifier
          }
        }`,
        variables: { data },
      })

      return res?.errors?.length
        ? this.errorResponse(res.errors)
        : this.okResponse(res.data)
    } catch (error) {
      return this.errorResponse([error])
    }
  }

  _admin_session = async (): Promise<ApiResponse<GenericResponse>> => {
    try {
      const res = await this.graphqlQuery({
        query: `query {
          _admin_session {
            message
          }
        }`,
      })

      return res?.errors?.length
        ? this.errorResponse(res.errors)
        : this.okResponse(res.data?._admin_session)
    } catch (error) {
      return this.errorResponse([error])
    }
  }

  _env = async (
    fields: ServerConfigInput[]
  ): Promise<ApiResponse<ServerConfigResponse>> => {
    const fieldList = fields.join(' ')
    try {
      const res = await this.graphqlQuery({
        query: `query {
          _env {
            ${fieldList}
          }
        }`,
      })

      return res?.errors?.length
        ? this.errorResponse(res.errors)
        : this.okResponse(res.data?._env)
    } catch (error) {
      return this.errorResponse([error])
    }
  }

  _webhook = async (data: IdInput): Promise<ApiResponse<WebhookResponse>> => {
    try {
      const res = await this.graphqlQuery({
        query: `query {	_webhook( params: $data) { id
          event_name
          endpoint
          enabled
          headers
          created_at
          updated_at } }`,
        variables: { data },
      })

      return res?.errors?.length
        ? this.errorResponse(res.errors)
        : this.okResponse(res.data?._webhook)
    } catch (error) {
      return this.errorResponse([error])
    }
  }

  _webhooks = async (
    data: PaginatedInput
  ): Promise<
    ApiResponse<{
      pagination: PaginationResponse
      _webhooks: WebhookResponse[]
    }>
  > => {
    try {
      const res = await this.graphqlQuery({
        query: `query {	_webhooks( params: $data) 
          pagination: {
            offset
            total
            page
            limit
          }
          _webhooks { 
            id
            event_name
            endpoint
            enabled
            headers
            created_at
            updated_at 
        }}`,
        variables: { data },
      })

      return res?.errors?.length
        ? this.errorResponse(res.errors)
        : this.okResponse(res.data)
    } catch (error) {
      return this.errorResponse([error])
    }
  }

  _webhook_logs = async (
    data: WebhookLogInput
  ): Promise<
    ApiResponse<{
      pagination: PaginationResponse
      _webhook_logs: WebhookLogResponse[]
    }>
  > => {
    try {
      const res = await this.graphqlQuery({
        query: `query {	_webhook_logs( params: $data) 
          pagination: {
            offset
            total
            page
            limit
          }
          _webhook_logs { 
            id
            http_status
            request
            response
            webhook_id
        }}`,
        variables: { data },
      })

      return res?.errors?.length
        ? this.errorResponse(res.errors)
        : this.okResponse(res.data)
    } catch (error) {
      return this.errorResponse([error])
    }
  }

  _email_templates = async (
    data: PaginatedInput
  ): Promise<
    ApiResponse<{
      pagination: PaginationResponse
      _email_templates: EmailTemplateResponse[]
    }>
  > => {
    try {
      const res = await this.graphqlQuery({
        query: `query {	_email_templates( params: $data) 
          pagination: {
            offset
            total
            page
            limit
          }
          _email_templates { 
            id
            event_name
            template
            design
            subject
            created_at
            updated_at
        }}`,
        variables: { data },
      })

      return res?.errors?.length
        ? this.errorResponse(res.errors)
        : this.okResponse(res.data)
    } catch (error) {
      return this.errorResponse([error])
    }
  }

  //MUTATIONS
  _admin_signup = async (data: {
    admin_secret: string
  }): Promise<ApiResponse<GenericResponse>> => {
    try {
      const res = await this.graphqlQuery({
        query: `mutation {
          _admin_signup(params: $data) {
            message
          }
        }`,
        variables: { data },
      })

      return res?.errors?.length
        ? this.errorResponse(res.errors)
        : this.okResponse(res.data?._admin_signup)
    } catch (error) {
      return this.errorResponse([error])
    }
  }

  _admin_login = async (data: {
    admin_secret: string
  }): Promise<ApiResponse<GenericResponse>> => {
    try {
      const res = await this.graphqlQuery({
        query: `mutation {
          _admin_login(params: $data) {
            message
          }
        }`,
        variables: { data },
      })

      return res?.errors?.length
        ? this.errorResponse(res.errors)
        : this.okResponse(res.data?._admin_login)
    } catch (error) {
      return this.errorResponse([error])
    }
  }

  _admin_logout = async (): Promise<ApiResponse<GenericResponse>> => {
    try {
      const res = await this.graphqlQuery({
        query: `mutation {
          _admin_logout {
            message
          }
        }`,
      })

      return res?.errors?.length
        ? this.errorResponse(res.errors)
        : this.okResponse(res.data?._admin_logout)
    } catch (error) {
      return this.errorResponse([error])
    }
  }

  _update_env = async (data: Env): Promise<ApiResponse<GenericResponse>> => {
    try {
      const res = await this.graphqlQuery({
        query: `mutation {
          _update_env(params: $data) {
            message
          }
        }`,
        variables: { data },
      })

      return res?.errors?.length
        ? this.errorResponse(res.errors)
        : this.okResponse(res.data?._update_env)
    } catch (error) {
      return this.errorResponse([error])
    }
  }

  _update_user = async (data: UpdateUserInput): Promise<ApiResponse<User>> => {
    try {
      const res = await this.graphqlQuery({
        query: `mutation {
          _update_user(
            params: $data
          ) {
            ${userFragment}
          }
        }`,
        variables: { data },
      })

      return res?.errors?.length
        ? this.errorResponse(res.errors)
        : this.okResponse(res.data?._update_user)
    } catch (error) {
      return this.errorResponse([error])
    }
  }

  _delete_user = async (data: {
    email: string
  }): Promise<ApiResponse<GenericResponse>> => {
    try {
      const res = await this.graphqlQuery({
        query: `mutation {
          _delete_user(params: $data) {
            message
          }
        }`,
        variables: { data },
      })

      return res?.errors?.length
        ? this.errorResponse(res.errors)
        : this.okResponse(res.data?._delete_user)
    } catch (error) {
      return this.errorResponse([error])
    }
  }

  _invite_members = async (
    data: InviteMemberInput
  ): Promise<ApiResponse<GenericResponse>> => {
    try {
      const res = await this.graphqlQuery({
        query: `mutation {
          _invite_members(params: $data) {
            message
          }
        }`,
        variables: { data },
      })

      return res?.errors?.length
        ? this.errorResponse(res.errors)
        : this.okResponse(res.data?._invite_members)
    } catch (error) {
      return this.errorResponse([error])
    }
  }

  _revoke_access = async (data: {
    user_id: string
  }): Promise<ApiResponse<GenericResponse>> => {
    try {
      const res = await this.graphqlQuery({
        query: `mutation {
          _revoke_access(params: $data) {
            message
          }
        }`,
        variables: { data },
      })

      return res?.errors?.length
        ? this.errorResponse(res.errors)
        : this.okResponse(res.data?._revoke_access)
    } catch (error) {
      return this.errorResponse([error])
    }
  }

  _enable_access = async (data: {
    user_id: string
  }): Promise<ApiResponse<GenericResponse>> => {
    try {
      const res = await this.graphqlQuery({
        query: `mutation {
          _enable_access(params: $data) {
            message
          }
        }`,
        variables: { data },
      })

      return res?.errors?.length
        ? this.errorResponse(res.errors)
        : this.okResponse(res.data?._enable_access)
    } catch (error) {
      return this.errorResponse([error])
    }
  }

  _generate_jwt_keys = async (
    data: GenerateJWTKeysInput
  ): Promise<ApiResponse<GenerateJWTKeysResponse>> => {
    try {
      const res = await this.graphqlQuery({
        query: `mutation {
          _generate_jwt_keys(params: $data) {
            message
          }
        }`,
        variables: { data },
      })

      return res?.errors?.length
        ? this.errorResponse(res.errors)
        : this.okResponse(res.data?._generate_jwt_keys)
    } catch (error) {
      return this.errorResponse([error])
    }
  }

  _test_endpoint = async (
    data: TestEndpointInput
  ): Promise<ApiResponse<TestEndpointResponse>> => {
    try {
      const res = await this.graphqlQuery({
        query: `mutation {
          _test_endpoint(params: $data) {
            http_status
            response
          }
        }`,
        variables: { data },
      })

      return res?.errors?.length
        ? this.errorResponse(res.errors)
        : this.okResponse(res.data?._test_endpoint)
    } catch (error) {
      return this.errorResponse([error])
    }
  }

  _add_webhook = async (
    data: AddWebhookInput
  ): Promise<ApiResponse<GenericResponse>> => {
    try {
      const res = await this.graphqlQuery({
        query: `mutation {
          _add_webhook(params: $data) {
            message
          }
        }`,
        variables: { data },
      })

      return res?.errors?.length
        ? this.errorResponse(res.errors)
        : this.okResponse(res.data?._add_webhook)
    } catch (error) {
      return this.errorResponse([error])
    }
  }

  _update_webhook = async (
    data: UpdateWebhookInput
  ): Promise<ApiResponse<GenericResponse>> => {
    try {
      const res = await this.graphqlQuery({
        query: `mutation {
          _update_webhook(params: $data) {
            message
          }
        }`,
        variables: { data },
      })

      return res?.errors?.length
        ? this.errorResponse(res.errors)
        : this.okResponse(res.data?._update_webhook)
    } catch (error) {
      return this.errorResponse([error])
    }
  }

  _delete_webhook = async (
    data: IdInput
  ): Promise<ApiResponse<GenericResponse>> => {
    try {
      const res = await this.graphqlQuery({
        query: `mutation {
          _delete_webhook(params: $data) {
            message
          }
        }`,
        variables: { data },
      })

      return res?.errors?.length
        ? this.errorResponse(res.errors)
        : this.okResponse(res.data?._delete_webhook)
    } catch (error) {
      return this.errorResponse([error])
    }
  }

  _add_email_template = async (
    data: AddEmailTemplateInput
  ): Promise<ApiResponse<GenericResponse>> => {
    try {
      const res = await this.graphqlQuery({
        query: `mutation {
          _add_email_template(params: $data) {
            message
          }
        }`,
        variables: { data },
      })

      return res?.errors?.length
        ? this.errorResponse(res.errors)
        : this.okResponse(res.data?._add_email_template)
    } catch (error) {
      return this.errorResponse([error])
    }
  }

  _update_email_template = async (
    data: UpdateEmailTemplateInput
  ): Promise<ApiResponse<GenericResponse>> => {
    try {
      const res = await this.graphqlQuery({
        query: `mutation {
          _update_email_template(params: $data) {
            message
          }
        }`,
        variables: { data },
      })

      return res?.errors?.length
        ? this.errorResponse(res.errors)
        : this.okResponse(res.data?._update_email_template)
    } catch (error) {
      return this.errorResponse([error])
    }
  }

  _delete_email_template = async (
    data: IdInput
  ): Promise<ApiResponse<GenericResponse>> => {
    try {
      const res = await this.graphqlQuery({
        query: `mutation {
          _delete_email_template(params: $data) {
            message
          }
        }`,
        variables: { data },
      })

      return res?.errors?.length
        ? this.errorResponse(res.errors)
        : this.okResponse(res.data?._delete_email_template)
    } catch (error) {
      return this.errorResponse([error])
    }
  }

  // helper to execute graphql queries
  // takes in any query or mutation string as input
  private graphqlQuery = async (
    data: GraphqlQueryInput
  ): Promise<GrapQlResponseType> => {
    const fetcher = getFetcher()
    const res = await fetcher(`${this.config.authorizerURL}/graphql`, {
      method: 'POST',
      body: JSON.stringify({
        query: data.query,
        variables: data.variables || {},
      }),
      headers: {
        ...this.config.extraHeaders,
        ...(data.headers || {}),
      },
      credentials: 'include',
    })

    const json = await res.json()

    if (json?.errors?.length) {
      console.error(json.errors)
      return { data: undefined, errors: json.errors }
    }

    return { data: json.data, errors: [] }
  }

  private errorResponse = (errors: Error[]): ApiResponse<any> => {
    return {
      data: undefined,
      errors,
    }
  }

  private okResponse = (data: any): ApiResponse<any> => {
    return {
      data,
      errors: [],
    }
  }
}
