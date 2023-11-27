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
import type {
  ApiResponse,
  AuthorizeResponse,
  ConfigType,
  GetTokenResponse,
} from './types'

// re-usable gql response fragment
const userFragment
  = 'id email email_verified given_name family_name middle_name nickname preferred_username picture signup_methods gender birthdate phone_number phone_number_verified roles created_at updated_at is_multi_factor_auth_enabled app_data'

// set fetch based on window object. Cross fetch have issues with umd build
const getFetcher = () => (hasWindow() ? window.fetch : crossFetch)

export * from './types'

export class Authorizer {
  // class variable
  config: ConfigType
  codeVerifier: string

  // constructor
  constructor(config: ConfigType) {
    if (!config)
      throw new Error('Configuration is required')

    this.config = config
    if (!config.authorizerURL && !config.authorizerURL.trim())
      throw new Error('Invalid authorizerURL')

    if (config.authorizerURL)
      this.config.authorizerURL = trimURL(config.authorizerURL)

    if (!config.redirectURL && !config.redirectURL.trim())
      throw new Error('Invalid redirectURL')
    else
      this.config.redirectURL = trimURL(config.redirectURL)

    this.config.extraHeaders = {
      ...(config.extraHeaders || {}),
      'x-authorizer-url': this.config.authorizerURL,
      'Content-Type': 'application/json',
    }
    this.config.clientID = config.clientID.trim()
  }

  authorize = async (data: Types.AuthorizeInput): Promise<ApiResponse<GetTokenResponse> | ApiResponse<AuthorizeResponse>> => {
    if (!hasWindow())
      return this.errorResponse(new Error('this feature is only supported in browser'))

    const scopes = ['openid', 'profile', 'email']
    if (data.use_refresh_token)
      scopes.push('offline_access')

    const requestData: Record<string, string> = {
      redirect_uri: this.config.redirectURL,
      response_mode: data.response_mode || 'web_message',
      state: encode(createRandomString()),
      nonce: encode(createRandomString()),
      response_type: data.response_type,
      scope: scopes.join(' '),
      client_id: this.config.clientID,
    }

    if (data.response_type === Types.ResponseTypes.Code) {
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
        DEFAULT_AUTHORIZE_TIMEOUT_IN_SECONDS,
      )

      if (data.response_type === Types.ResponseTypes.Code) {
        // get token and return it
        const tokenResp: ApiResponse<GetTokenResponse> = await this.getToken({ code: iframeRes.code })
        return tokenResp.ok ? this.okResponse(tokenResp.response) : this.errorResponse(tokenResp.error!)
      }

      // this includes access_token, id_token & refresh_token(optionally)
      return this.okResponse(iframeRes)
    }
    catch (err) {
      if (err.error) {
        window.location.replace(
          `${this.config.authorizerURL}/app?state=${encode(
            JSON.stringify(this.config),
          )}&redirect_uri=${this.config.redirectURL}`,
        )
      }

      return this.errorResponse(err)
    }
  }

  _user = async (data?: Types.UserInput): Promise<Types.User | void> => {
    try {
      const userRes = await this.graphqlQuery({
        query: `query {	_user( params: $data) { ${userFragment} } }`,
        variables: { data },
      })

      return userRes
    }
    catch (error) {
      throw new Error(error)
    }
  }

  _users = async (data?: Types.PaginatedInput): Promise<{pagination: Types.PaginationResponse, users: Types.User[]} | void> => {
    try {
      const profileRes = await this.graphqlQuery({
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

      return profileRes
    }
    catch (error) {
      throw new Error(error)
    }
  }

  _verification_requests = async (data?: Types.PaginatedInput): Promise<{pagination: Types.PaginationResponse, verification_requests: Types.VerificationResponse[]} | void> => {
    try {
      const profileRes = await this.graphqlQuery({
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

      return profileRes
    }
    catch (error) {
      throw new Error(error)
    }
  }

  _admin_session = async (): Promise<Types.GenericResponse | void> => {
    try {
      const profileRes = await this.graphqlQuery({
        query: `query {
          _admin_session {
            message
          }
        }`
      })

      return profileRes._admin_session
    }
    catch (error) {
      throw new Error(error)
    }
  }

  _env = async (fields: Types.ServerConfigInput[]): Promise<Types.ServerConfigResponse | void> => {
    const fieldList = fields.join(' ');
    try {
      const profileRes = await this.graphqlQuery({
        query: `query {
          _env {
            ${fieldList}
          }
        }`
      })

      return profileRes._env
    }
    catch (error) {
      throw new Error(error)
    }
  }

  _webhook = async (data: Types.WebhookInput): Promise<Types.WebhookResponse | void> => {
    try {
      const userRes = await this.graphqlQuery({
        query: `query {	_webhook( params: $data) { id
          event_name
          endpoint
          enabled
          headers
          created_at
          updated_at } }`,
        variables: { data },
      })

      return userRes._webhook
    }
    catch (error) {
      throw new Error(error)
    }
  }

  _webhooks = async (data: Types.PaginatedInput): Promise<{pagination: Types.PaginationResponse, webhooks: Types.WebhookResponse[]} | void> => {
    try {
      return await this.graphqlQuery({
        query: `query {	_webhooks( params: $data) 
          pagination: {
            offset
            total
            page
            limit
          }
          webhooks { 
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
    }
    catch (error) {
      throw new Error(error)
    }
  }

  _webhook_logs = async (data: Types.WebhookLogInput): Promise<{pagination: Types.PaginationResponse, webhook_logs: Types.WebhookLogResponse[]} | void> => {
    try {
      return await this.graphqlQuery({
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
    }
    catch (error) {
      throw new Error(error)
    }
  }

  _email_templates = async (data: Types.PaginatedInput): Promise<{pagination: Types.PaginationResponse, email_templates	: Types.EmailTemplateResponse[]} | void> => {
    try {
      return await this.graphqlQuery({
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
    }
    catch (error) {
      throw new Error(error)
    }
  }

  //MUTATIONS
  _admin_signup = async (data: {admin_secret: string}): Promise<Types.GenericResponse | void> => {
    try {
      return await this.graphqlQuery({
        query: `mutation {
          _admin_signup(params: $data) {
            message
          }
        }`,
        variables: { data },
      })
    }
    catch (error) {
      throw new Error(error)
    }
  }

  _admin_login = async (data: {admin_secret: string}): Promise<Types.GenericResponse | void> => {
    try {
      return await this.graphqlQuery({
        query: `mutation {
          _admin_login(params: $data) {
            message
          }
        }`,
        variables: { data },
      })
    }
    catch (error) {
      throw new Error(error)
    }
  }

  _admin_logout = async (): Promise<Types.GenericResponse | void> => {
    try {
      return await this.graphqlQuery({
        query: `mutation {
          _admin_logout {
            message
          }
        }`,
      })
    }
    catch (error) {
      throw new Error(error)
    }
  }

  _update_env = async (data: Types.Env): Promise<Types.GenericResponse | void> => {
    try {
      return await this.graphqlQuery({
        query: `mutation {
          _update_env(params: $data) {
            message
          }
        }`,
        variables: { data },
      })
    }
    catch (error) {
      throw new Error(error)
    }
  }
  
  _update_user = async (data: Types.UpdateUserInput): Promise<Types.User | void> => {
    try {
      return await this.graphqlQuery({
        query: `mutation {
          _update_user(
            params: $data
          ) {
            ${userFragment}
          }
        }`,
        variables: { data },
      })
    }
    catch (error) {
      throw new Error(error)
    }
  }

  _delete_user = async (data: {email: string}): Promise<Types.GenericResponse | void> => {
    try {
      return await this.graphqlQuery({
        query: `mutation {
          _delete_user(params: $data) {
            message
          }
        }`,
        variables: { data },
      })
    }
    catch (error) {
      throw new Error(error)
    }
  }

  _invite_members = async (data: Types.InviteMemberInput): Promise<Types.GenericResponse | void> => {
    try {
      return await this.graphqlQuery({
        query: `mutation {
          _invite_members(params: $data) {
            message
          }
        }`,
        variables: { data },
      })
    }
    catch (error) {
      throw new Error(error)
    }
  }



  // helper to execute graphql queries
  // takes in any query or mutation string as input
  private graphqlQuery = async (data: Types.GraphqlQueryInput) => {
    const fetcher = getFetcher()
    const res = await fetcher(`${this.config.authorizerURL}/graphql`, {
      method: 'POST',
      body: JSON.stringify({
        query: data.query,
        variables: data.variables || {},
      }),
      headers: {
        ...(this.config.adminSecret ? { 'x-authorizer-admin-secret': this.config.adminSecret } : {}),
        ...this.config.extraHeaders,
        ...(data.headers || {}),
      },
      credentials: 'include',
    })

    const json = await res.json()

    if (json.errors && json.errors.length) {
      console.error(json.errors)
      throw new Error(json.errors[0].message)
    }

    return json.data
  }

  private errorResponse = (error: Error): ApiResponse<any> => {
    return {
      ok: false,
      response: undefined,
      error,
    }
  }

  private okResponse = (response: any): ApiResponse<any> => {
    return {
      ok: true,
      response,
      error: undefined,
    }
  }
}
