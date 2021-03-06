/* global fetch */
import LokkaTransport from 'lokka/transport';
import queryString from 'query-string';
// In some envionment like in ReactNative, we don't need fetch at all.
// Technically, this should be handle by 'isomorphic-fetch'.
// But it's not happening. So this is the fix

let fetchUrl;
if (typeof fetch === 'function') {
  // has a native fetch implementation
  fetchUrl = fetch;
} else if (typeof __dirname !== 'undefined') {
  // for Node.js
  fetchUrl = require('node-fetch');
  fetchUrl.Promise = Promise;
} else {
  // for the browser
  fetchUrl = require('whatwg-fetch');
}

export class Transport extends LokkaTransport {
  constructor(endpoint, options = {}) {
    if (!endpoint) {
      throw new Error('endpoint is required!');
    }

    super();
    this._httpOptions = {
      auth: options.auth,
      headers: options.headers || {}
    };
    this.endpoint = endpoint;
  }

  _buildOptions(payload) {
    let options = {
      method: 'get',
      headers: {}
      // To pass cookies to the server. (supports CORS as well)
      // credentials: 'include'
    };

    if (payload.query.split(' ')[0] === 'mutation') {
      options.method = 'post';
      options.body = JSON.stringify(payload);
    }

    Object.assign(options.headers, this._httpOptions.headers);
    return options;
  }

  send(query, variables, operationName) {
    const payload = {query, variables, operationName};
    const options = this._buildOptions(payload);
    const endpointWithQuery = `
      ${this.endpoint}?${queryString.stringify(payload)}
    `;

    return fetchUrl(endpointWithQuery, options).then(response => {
      // 200 is for success
      // 400 is for bad request
      if (response.status !== 200 && response.status !== 400) {
        throw new Error(`Invalid status code: ${response.status}`);
      }

      return response.json();
    }).then(({data, errors}) => {
      if (errors) {
        const message = errors[0].message;
        const error = new Error(`GraphQL Error: ${message}`);
        error.rawError = errors;

        throw error;
      }

      return data;
    });
  }
}

export default Transport;
