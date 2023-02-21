/** @typedef {import("../../../Adapter/AuthenticationImplementation/AuthenticationImplementation.mjs").AuthenticationImplementation} AuthenticationImplementation */
/** @typedef {import("../../../../../flux-http-api/src/Adapter/Server/HttpServerRequest.mjs").HttpServerRequest} HttpServerRequest */
/** @typedef {import("../../../../../flux-http-api/src/Adapter/Server/HttpServerResponse.mjs").HttpServerResponse} HttpServerResponse */

export class HandleAuthenticationCommand {
    /**
     * @type {AuthenticationImplementation}
     */
    #authentication_implementation;

    /**
     * @param {AuthenticationImplementation} authentication_implementation
     * @returns {HandleAuthenticationCommand}
     */
    static new(authentication_implementation) {
        return new this(
            authentication_implementation
        );
    }

    /**
     * @param {AuthenticationImplementation} authentication_implementation
     * @private
     */
    constructor(authentication_implementation) {
        this.#authentication_implementation = authentication_implementation;
    }

    /**
     * @param {HttpServerRequest} request
     * @returns {Promise<HttpServerResponse | {[key: string]: *}>}
     */
    async handleAuthentication(request) {
        return this.#authentication_implementation.handleAuthentication(
            request
        );
    }
}
