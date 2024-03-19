/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2019 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Yevhen Kyriukha - yevhen.kyriukha@modusbox.com                   *
 **************************************************************************/

jest.mock('http');
const http = require('http');
const WSO2Auth = require('../../src/lib/WSO2Auth');
const mockLogger = require('../__mocks__/mockLogger');

describe('WSO2Auth', () => {
    let mockOpts, basicToken;

    beforeEach(() => {
        const clientKey = 'client-key';
        const clientSecret = 'client-secret';
        mockOpts = {
            logger: mockLogger({ app: 'wso2-auth' }, undefined),
            clientKey,
            clientSecret,
            tokenEndpoint: 'http://token-endpoint.com/v2',
            refreshSeconds: 2,
        };
        basicToken = Buffer.from(`${clientKey}:${clientSecret}`).toString('base64');
    });

    async function testTokenRefresh(userRefreshSeconds, tokenExpiresSeconds) {
        const TOKEN = 'new-token';
        const tokenExpirySeconds = ((typeof tokenExpiresSeconds === 'number') && (tokenExpiresSeconds > 0))
            ? tokenExpiresSeconds : Infinity;
        const actualRefreshMs = Math.min(userRefreshSeconds, tokenExpirySeconds) * 1000;
        const opts = {
            ...mockOpts,
            refreshSeconds: userRefreshSeconds,
        };
        const now = Date.now();
        let tokenRefreshTime = now;

        http.__request = jest.fn(() => {
            tokenRefreshTime = Date.now();
            return {
                statusCode: 200,
                data: {
                    access_token: TOKEN,
                    expires_in: tokenExpiresSeconds,
                },
            };
        });

        const auth = new WSO2Auth(opts);
        await auth.start();
        const token = auth.getToken();
        expect(http.__request).toHaveBeenCalledTimes(1);
        expect(http.__request.mock.calls[0][0].headers['Authorization']).toBe(`Basic ${basicToken}`);
        expect(token).toBe(TOKEN);
        // Wait for token refresh
        await new Promise(resolve => {
            setTimeout(() => resolve(), actualRefreshMs + 100);
        });
        expect(http.__request).toHaveBeenCalledTimes(2);
        const tokenRefreshInterval = tokenRefreshTime - now;
        expect(tokenRefreshInterval - actualRefreshMs).toBeLessThan(500);
        auth.stop();
        http.__request.mockClear();
    }

    test('should return static token when static token was provided', async () => {
        const TOKEN = 'abc123';
        const auth = new WSO2Auth({
            logger: mockLogger({ app: 'wso2-auth' }, undefined),
            staticToken: TOKEN,
            refreshSeconds: 2,
        });
        await auth.start();
        const token = auth.getToken();
        expect(token).toBe(TOKEN);
        auth.stop();
    });

    test('should return new token when token API info was provided', async () => {
        const TOKEN = 'new-token';
        const opts = mockOpts;
        http.__request = jest.fn(() => ({
            statusCode: 200,
            data: {
                access_token: TOKEN,
            },
        }));
        const auth = new WSO2Auth(opts);
        await auth.start();
        const token = auth.getToken();
        expect(http.__request).toHaveBeenCalledTimes(1);
        expect(http.__request.mock.calls[0][0].headers['Authorization']).toBe(`Basic ${basicToken}`);
        expect(token).toBe(TOKEN);
        auth.stop();
        http.__request.mockClear();
    });

    test(
        'should refresh token using user provided interval value',
        () => testTokenRefresh(3, 1000)
    );

    test(
        'should refresh token using user provided interval value when token expiry is negative',
        () => testTokenRefresh(3, -1)
    );

    test(
        'should refresh token using user provided interval value when token expiry is string',
        () => testTokenRefresh(3, '1')
    );

    test(
        'should refresh token using OAuth2 token expiry value',
        () => testTokenRefresh(4, 3)
    );

    test('should emit error when receiving a 401 from WSO2', async () => {
        const opts = mockOpts;
        http.__request = jest.fn(() => ({ statusCode: 401, }));
        const auth = new WSO2Auth(opts);
        const errCallback = jest.fn();
        auth.on('error', errCallback);
        await auth.start();
        expect(http.__request).toHaveBeenCalledTimes(1);
        expect(http.__request.mock.calls[0][0].headers['Authorization'])
            .toBe(`Basic ${basicToken}`);
        expect(errCallback).toHaveBeenCalledTimes(1);
        auth.stop();
        http.__request.mockClear();
    });
});
