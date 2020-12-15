const dfn = require('@netlify/open-api')
const pWaitFor = require('p-wait-for')

const deploy = require('./deploy')
const { addMethods } = require('./methods')
const { getOperations } = require('./operations')

class NetlifyAPI {
  constructor(firstArg, secondArg) {
    addMethods(this)

    // variadic arguments
    const [accessTokenInput, opts = {}] = typeof firstArg === 'object' ? [null, firstArg] : [firstArg, secondArg]

    // default opts
    const {
      userAgent = 'netlify/js-client',
      scheme = dfn.schemes[0],
      host = dfn.host,
      pathPrefix = dfn.basePath,
      accessToken = accessTokenInput,
      globalParams = {},
      agent,
    } = opts

    const defaultHeaders = {
      'User-agent': userAgent,
      accept: 'application/json',
    }

    Object.assign(this, { defaultHeaders, scheme, host, pathPrefix, globalParams, accessToken, agent })
  }

  get accessToken() {
    const {
      defaultHeaders: { Authorization },
    } = this
    if (typeof Authorization !== 'string' || !Authorization.startsWith('Bearer ')) {
      return null
    }

    return Authorization.replace('Bearer ', '')
  }

  set accessToken(token) {
    if (!token) {
      // eslint-disable-next-line fp/no-delete
      delete this.defaultHeaders.Authorization
      return
    }

    this.defaultHeaders.Authorization = `Bearer ${token}`
  }

  get basePath() {
    return `${this.scheme}://${this.host}${this.pathPrefix}`
  }

  async getAccessToken(ticket, { poll = 1000, timeout = 3.6e6 } = {}) {
    const { id } = ticket

    // ticket capture
    let authorizedTicket
    const checkTicket = async () => {
      const t = await this.showTicket({ ticketId: id })
      if (t.authorized) {
        authorizedTicket = t
      }
      return Boolean(t.authorized)
    }

    await pWaitFor(checkTicket, {
      interval: poll,
      timeout,
      message: 'Timeout while waiting for ticket grant',
    })

    const accessTokenResponse = await this.exchangeTicket({ ticketId: authorizedTicket.id })
    // See https://open-api.netlify.com/#/default/exchangeTicket for shape
    this.accessToken = accessTokenResponse.access_token
    return accessTokenResponse.access_token
  }

  async deploy(siteId, buildDir, opts) {
    if (!this.accessToken) throw new Error('Missing access token')
    // the deploy function is swapped in the package.json browser field for different environments
    // See https://github.com/defunctzombie/package-browser-field-spec
    return await deploy(this, siteId, buildDir, opts)
  }
}

module.exports = NetlifyAPI

module.exports.methods = getOperations()
