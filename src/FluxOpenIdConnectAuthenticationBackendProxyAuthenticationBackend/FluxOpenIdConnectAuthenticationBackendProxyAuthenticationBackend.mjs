import { FluxAuthenticationBackend } from "../FluxAuthenticationBackend.mjs";
import { HttpClientRequest } from "../../../flux-http-api/src/Client/HttpClientRequest.mjs";
import { HttpServerResponse } from "../../../flux-http-api/src/Server/HttpServerResponse.mjs";
import { METHOD_GET } from "../../../flux-http-api/src/Method/METHOD.mjs";
import { FLUX_OPEN_ID_CONNECT_AUTHENTICATION_BACKEND_PROXY_AUTHENTICATION_BACKEND_DEFAULT_BASE_ROUTE, FLUX_OPEN_ID_CONNECT_AUTHENTICATION_BACKEND_PROXY_AUTHENTICATION_BACKEND_DEFAULT_URL } from "./FLUX_OPEN_ID_CONNECT_AUTHENTICATION_BACKEND_PROXY_AUTHENTICATION_BACKEND.mjs";
import { HEADER_ACCEPT, HEADER_CONTENT_TYPE, HEADER_COOKIE, HEADER_LOCATION, HEADER_SET_COOKIE, HEADER_X_FLUX_AUTHENTICATION_FRONTEND_URL, HEADER_X_FORWARDED_HOST, HEADER_X_FORWARDED_PROTO } from "../../../flux-http-api/src/Header/HEADER.mjs";
import { STATUS_CODE_302, STATUS_CODE_401 } from "../../../flux-http-api/src/Status/STATUS_CODE.mjs";

/** @typedef {import("../../../flux-http-api/src/FluxHttpApi.mjs").FluxHttpApi} FluxHttpApi */
/** @typedef {import("../../../flux-http-api/src/Server/HttpServerRequest.mjs").HttpServerRequest} HttpServerRequest */
/** @typedef {import("../UserInfo.mjs").UserInfo} UserInfo */

export class FluxOpenIdConnectAuthenticationBackendProxyAuthenticationBackend extends FluxAuthenticationBackend {
    /**
     * @type {string}
     */
    #base_route;
    /**
     * @type {FluxHttpApi}
     */
    #flux_http_api;
    /**
     * @type {string | null}
     */
    #https_certificate;
    /**
     * @type {string}
     */
    #url;

    /**
     * @param {FluxHttpApi} flux_http_api
     * @param {string | null} base_route
     * @param {string | null} url
     * @param {string | null} https_certificate
     * @returns {FluxOpenIdConnectAuthenticationBackendProxyAuthenticationBackend}
     */
    static new(flux_http_api, base_route = null, url = null, https_certificate = null) {
        return new this(
            flux_http_api,
            base_route ?? FLUX_OPEN_ID_CONNECT_AUTHENTICATION_BACKEND_PROXY_AUTHENTICATION_BACKEND_DEFAULT_BASE_ROUTE,
            url ?? FLUX_OPEN_ID_CONNECT_AUTHENTICATION_BACKEND_PROXY_AUTHENTICATION_BACKEND_DEFAULT_URL,
            https_certificate
        );
    }

    /**
     * @param {FluxHttpApi} flux_http_api
     * @param {string} base_route
     * @param {string} url
     * @param {string | null} https_certificate
     * @private
     */
    constructor(flux_http_api, base_route, url, https_certificate) {
        super();

        this.#flux_http_api = flux_http_api;
        this.#base_route = base_route;
        this.#url = url;
        this.#https_certificate = https_certificate;
    }

    /**
     * @param {HttpServerRequest} request
     * @returns {Promise<HttpServerResponse | UserInfo>}
     */
    async handleAuthentication(request) {
        for (const route of [
            "callback",
            "login",
            "logout"
        ]) {
            if (request.url.pathname === `${this.#base_route !== "/" ? this.#base_route : ""}/${route}`) {
                const response = await this.#flux_http_api.validateMethods(
                    request,
                    [
                        METHOD_GET
                    ]
                );

                if (response !== null) {
                    return response;
                }

                return this.#flux_http_api.proxyRequest(
                    {
                        url: `${this.#url}/api/${route}`,
                        request,
                        request_query_params: route === "callback",
                        request_headers: [
                            HEADER_COOKIE
                        ],
                        request_forwarded_headers: true,
                        response_redirect: true,
                        response_headers: [
                            HEADER_CONTENT_TYPE,
                            HEADER_LOCATION,
                            HEADER_SET_COOKIE
                        ],
                        server_certificate: this.#https_certificate
                    }
                );
            }
        }

        const response = await this.#flux_http_api.request(
            HttpClientRequest.new(
                new URL(`${this.#url}/api/user-infos`),
                null,
                null,
                {
                    ...[
                        HEADER_ACCEPT,
                        HEADER_COOKIE
                    ].reduce((headers, key) => {
                        const value = request.header(
                            key
                        );

                        if (value === null) {
                            return headers;
                        }

                        headers[key] = value;

                        return headers;
                    }, {}),
                    [HEADER_X_FORWARDED_HOST]: request.url.host,
                    [HEADER_X_FORWARDED_PROTO]: request.url.protocol.slice(0, -1)
                },
                null,
                null,
                null,
                this.#https_certificate
            )
        );

        if (response.status_code === STATUS_CODE_302 || response.status_code === STATUS_CODE_401) {
            return HttpServerResponse.new(
                response.body,
                response.status_code,
                [
                    HEADER_CONTENT_TYPE,
                    HEADER_LOCATION,
                    HEADER_SET_COOKIE,
                    HEADER_X_FLUX_AUTHENTICATION_FRONTEND_URL
                ].reduce((headers, key) => {
                    const value = response.header(
                        key
                    );

                    if (value === null) {
                        return headers;
                    }

                    headers[key] = value;

                    return headers;
                }, {}),
                null,
                response.status_message
            );
        }

        for (const key of [
            HEADER_SET_COOKIE
        ]) {
            const value = response.header(
                key
            );

            if (value === null) {
                continue;
            }

            request._res?.setHeader(key, value);
        }

        if (!response.status_code_is_ok) {
            return Promise.reject(response);
        }

        return response.body.json();
    }
}