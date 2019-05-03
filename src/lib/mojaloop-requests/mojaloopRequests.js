/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2019 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       James Bush - james.bush@modusbox.com                             *
 **************************************************************************/

'use strict';

const request = require('request-promise-native');

const http = require('http');
const https = require('https');

const common = require('./common.js');
const buildUrl = common.buildUrl;
const throwOrJson = common.throwOrJson;

const JwsSigner = require('@internal/jws').signer;


/**
 * A class for making outbound requests with mutually authenticated TLS and JWS signing
 */
class MojaloopRequests {
    constructor(config) {
        this.config = config;
        this.logger = config.logger;

        // FSPID of THIS DFSP
        this.dfspId = config.dfspId;

        if(config.tls.mutualTLS.enabled) {
            this.agent = new https.Agent({
                ...config.tls.outboundCreds,
                keepAlive: true
            });

            this.transportScheme = 'https';
        }
        else {
            this.agent = http.globalAgent;
            this.transportScheme = 'http';
        }

        // flag to turn jws signing on/off
        this.jwsSign = config.jwsSign;

        this.jwsSigner = new JwsSigner({
            logger: config.logger,
            signingKey: config.jwsSigningKey
        });

        // Switch or peer DFSP endpoint
        this.peerEndpoint = `${this.transportScheme}://${config.peerEndpoint}`;
    }


    /**
     * Executes a GET /parties request for the specified identifier type and identifier 
     *
     * @returns {object} - JSON response body if one was received
     */
    async getParties(idType, idValue) {
        return this._get(`parties/${idType}/${idValue}`, 'parties');
    }


    /**
     * Executes a PUT /parties request for the specified identifier type and indentifier
     */
    async putParties(idType, idValue, body, destFspId) {
        return this._put(`parties/${idType}/${idValue}`, 'parties', body, destFspId);
    }


    /**
     * Executes a PUT /participants request for the specified identifier type and indentifier
     */
    async putParticipants(idType, idValue, body, destFspId) {
        return this._put(`participants/${idType}/${idValue}`, 'participants', body, destFspId);
    }


    /**
     * Executes a POST /quotes request for the specified quote request
     *
     * @returns {object} - JSON response body if one was received
     */
    async postQuotes(quoteRequest, destFspId) {
        return this._post('quotes', 'quotes', quoteRequest, destFspId);
    }


    /**
     * Executes a PUT /quotes/{ID} request for the specified quote
     */
    async putQuotes(quoteResponse, destFspId) {
        return this._put(`quotes/${quoteResponse.quoteId}`, 'quotes', quoteResponse, destFspId);
    }
    

    /**
     * Executes a POST /transfers request for the specified transfer prepare
     *
     * @returns {object} - JSON response body if one was received
     */
    async postTransfers(prepare, destFspId) {
        return this._post('transfers', 'transfers', prepare, destFspId);
    }


    /**
     * Executes a PUT /transfers/{ID} request for the specified transfer fulfilment
     *
     * @returns {object} - JSON response body if one was received
     */
    async putTransfers(transferId, fulfilment, destFspId) {
        return this._put(`transfers/${transferId}`, 'transfers', fulfilment, destFspId);
    }


    /**
     * Utility function for building outgoing request headers as required by the mojaloop api spec
     *
     * @returns {object} - headers object for use in requests to mojaloop api endpoints
     */
    _buildHeaders (resourceType, dest) {
        let headers = {
            'content-type': `application/vnd.interoperability.${resourceType}+json;version=1.0`,
            'accept': `application/vnd.interoperability.${resourceType}+json;version=1.0`,
            'date': new Date().toUTCString(),
            'fspiop-source': this.dfspId
        };

        if(dest) {
            headers['fspiop-destination'] = dest;
        }

        return headers;
    }


    async _get(url, resourceType, dest) {
        const reqOpts = {
            method: 'GET',
            uri: buildUrl(this.peerEndpoint, url),
            headers: this._buildHeaders(resourceType, dest),
            agent: this.agent,
            resolveWithFullResponse: true,
            simple: false 
        };

        if(this.jwsSign) {
            this.jwsSigner.sign(reqOpts);
        }

        try {
            return await request(reqOpts).then(throwOrJson);
        }
        catch (e) {
            this.logger.log('Error attempting GET. URL:', url, 'Opts:', reqOpts, 'Error:', e);
            throw e;
        }
    }


    async _put(url, resourceType, body, dest) {
        const reqOpts = {
            method: 'PUT',
            uri: buildUrl(this.peerEndpoint, url),
            headers: this._buildHeaders(resourceType, dest),
            body: body,
            resolveWithFullResponse: true,
            simple: false
        };

        if(this.jwsSign) {
            this.jwsSigner.sign(reqOpts);
        }

        try {
            return await request(reqOpts).then(throwOrJson);
        }
        catch (e) {
            this.logger.log('Error attempting PUT. URL:', url, 'Opts:', reqOpts, 'Body:', body, 'Error:', e);
            throw e;
        }
    }


    async _post(url, resourceType, body, dest) {
        const reqOpts = {
            method: 'POST',
            uri: buildUrl(this.peerEndpoint, url),
            headers: this._buildHeaders(resourceType, dest),
            body: body,
            resolveWithFullResponse: true,
            simple: false
        };

        if(this.jwsSign) {
            this.jwsSigner.sign(reqOpts);
        }

        try {
            return await request(reqOpts).then(throwOrJson);
        }
        catch (e) {
            this.logger.log('Error attempting POST. URL:', url, 'Opts:', reqOpts, 'Body:', body, 'Error:', e);
            throw e;
        }
    }
}



module.exports = MojaloopRequests;