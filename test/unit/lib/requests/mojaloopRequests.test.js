/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2019 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       James Bush - james.bush@modusbox.com                             *
 **************************************************************************/

const fs = require('fs');
jest.mock('http');
const http = require('http');

const mr = require('../../../../src/lib/requests/mojaloopRequests.js');
const WSO2Auth = require('../../../../src/lib/WSO2Auth');
const mockLogger = require('../../../__mocks__/mockLogger');
const { ApiType} = require('../../../../src/lib/requests/apiTransformer');

// dummy request bodies
const putPartiesBody = require('../../data/putPartiesBody.json');
const putErrorBody = require('../../data/putErrorBody.json');
const postParticipantsBody = require('../../data/postParticipantsBody.json');

const jwsSigningKey = fs.readFileSync(__dirname + '/../../data/jwsSigningKey.pem');

describe('PUT /parties', () => {

    async function testPutParties (jwsSign, jwsSignPutParties, expectUndefined) {
        const wso2Auth = new WSO2Auth({ logger: console });

        // Everything is false by default
        const conf = {
            logger: mockLogger({ app: 'put-parties-test' }, undefined),
            peerEndpoint: '127.0.0.1',
            tls: {
                mutualTLS: {
                    enabled: false
                }
            },
            jwsSign: jwsSign,
            jwsSignPutParties: jwsSignPutParties,
            jwsSigningKey: jwsSigningKey,
            wso2Auth,
        };

        http.__request = jest.fn(() => ({
            statusCode: 200,
            headers: {
                'content-length': 0
            },
        }));

        const testMr = new mr(conf);
        await testMr.putParties('MSISDN', '123456', '', 'dummy');


        if (expectUndefined) {
            expect(http.__request.mock.calls[0][0].headers['fspiop-signature']).toBeUndefined();
        } else {
            expect(http.__request.mock.calls[0][0].headers['fspiop-signature']).toBeTruthy();
        }

        http.__request.mockClear();
    }

    test(
        'signs put parties when jwsSign and jwsSignPutParties are true',
        async () => {
            await testPutParties(true, true, false);
        }
    );


    test(
        'does not sign put parties when jwsSign is true and jwsSignPutParties is false',
        async () => {
            await testPutParties(true, false, true);
        }
    );


    test(
        'does not sign put parties when jwsSign and jwsSignPutParties are false',
        async () => {
            await testPutParties(false, false, true);
        }
    );


    test(
        'does not sign put parties when jwsSign is false and jwsSignPutParties is true',
        async () => {
            await testPutParties(false, true, true);
        }
    );
});

describe('PUT /quotes', () => {

    async function testPutQuotes (jwsSign, jwsSignPutParties, expectUndefined) {
        const wso2Auth = new WSO2Auth({ logger: console });

        // Everything is false by default
        const conf = {
            // Disable logging in tests
            logger: mockLogger({ app: 'put-quotes-test' }, undefined),
            tls: {
                mutualTLS: {
                    enabled: false
                }
            },
            jwsSign: jwsSign,
            jwsSignPutParties: jwsSignPutParties,
            jwsSigningKey: jwsSigningKey,
            wso2Auth,
        };

        http.__request = jest.fn(() => ({
            statusCode: 200,
            headers: {
                'content-length': 0
            },
        }));

        const testMr = new mr(conf);
        await testMr.putQuotes('fake-quote', { quoteId: 'dummy' }, 'dummy');

        if (expectUndefined) {
            expect(http.__request.mock.calls[0][0].headers['fspiop-signature']).toBeUndefined();
        } else {
            expect(http.__request.mock.calls[0][0].headers['fspiop-signature']).toBeTruthy();
        }

        http.__request.mockClear();
    }


    test(
        'signs put quotes when jwsSign is true and jwsSignPutParties is false',
        async () => {
            await testPutQuotes(true, false, false);
        }
    );


    test(
        'does not sign put quotes when jwsSign is false and jwsSignPutParties is true',
        async () => {
            await testPutQuotes(false, true, true);
        }
    );


    test(
        'does not sign put quotes when jwsSign is false and jwsSignPutParties is false',
        async () => {
            await testPutQuotes(false, false, true);
        }
    );


    test(
        'signs put parties when jwsSign is true and jwsSignPutParties is not supplied',
        async () => {
            await testPutQuotes(true, undefined);
        }
    );


    test(
        'does not sign put parties when jwsSign is false and jwsSignPutParties is not supplied',
        async () => {
            await testPutQuotes(false, undefined, true);
        }
    );
});

describe('postAuthorizations', () => {
    const wso2Auth = new WSO2Auth({ logger: mockLogger({ app: 'post-authorizations-test' }, undefined) });
    const conf = {
        logger: mockLogger({ app: 'postAuthorizations-test' }, undefined),
        peerEndpoint: '127.0.0.1',
        tls: {
            mutualTLS: {
                enabled: false
            }
        },
        jwsSign: false,
        jwsSignPutParties: false,
        jwsSigningKey: jwsSigningKey,
        wso2Auth,
    };

    it('executes a `POST /authorizations` request', async () => {
        // Arrange
        http.__request = jest.fn(() => ({
            statusCode: 202,
            headers: {
                'content-length': 0
            },
        }));
        const testMR = new mr(conf);
        const authorizationRequest = {
            transactionRequestId: '123',
            authenticationType: 'U2F',
            retriesLeft: '1',
            amount: {
                amount: '100',
                currency: 'U2F',
            },
            transactionId: '987'
        };

        // Act
        await testMR.postAuthorizations(authorizationRequest, 'pispa');

        // Assert
        expect(http.__write.mock.calls[0][0]).toStrictEqual(JSON.stringify(authorizationRequest));
        expect(http.__request.mock.calls[0][0].headers['fspiop-destination']).toBe('pispa');
        expect(http.__request.mock.calls[0][0].path).toBe('/authorizations');
    });
});

describe('patchTransfers', () => {
    const wso2Auth = new WSO2Auth({ logger: mockLogger({ app: 'post-authorizations-test' }) }, undefined);
    const conf = {
        logger: mockLogger({ app: 'postAuthorizations-test' }, undefined),
        peerEndpoint: '127.0.0.1',
        tls: {
            mutualTLS: {
                enabled: false
            }
        },
        jwsSign: false,
        jwsSignPutParties: false,
        jwsSigningKey: jwsSigningKey,
        wso2Auth,
    };

    it('executes a PATCH /transfers request', async () => {
        // Arrange
        http.__request = jest.fn(() => ({
            statusCode: 202,
            headers: {
                'content-length': 0
            },
        }));
        const testMR = new mr(conf);

        const now = new Date();
        const xferId = '123456';

        const patchRequest = {
            completedTimestamp: now.toISOString(),
            transferState: 'COMMITTED',
        };

        // Act
        await testMR.patchTransfers(xferId, patchRequest, 'patchdfsp');

        // Assert
        expect(http.__write.mock.calls[0][0]).toStrictEqual(JSON.stringify(patchRequest));
        expect(http.__request.mock.calls[0][0].headers['fspiop-destination']).toBe('patchdfsp');
        expect(http.__request.mock.calls[0][0].path).toBe(`/transfers/${xferId}`);
        expect(http.__request.mock.calls[0][0].method).toBe('PATCH');
    });
});


// utility function that return a mock http ClientRequest type object which will complete a request and allow seeing
// the sent headers and body etc...
const getReqMock = (options, callback) => {
    return {
        on: jest.fn(),
        write: jest.fn(() => {
            console.log('reqMock.write called');
            return true;
        }),
        end: jest.fn().mockImplementation(() => {
            console.log('reqMock.end called');
            const mr = {
                statusCode: 202,
                headers: {
                    'content-type': 'application/json',
                },
                on: jest.fn((event, eventCallback) => {
                    if (event === 'data') {
                        // simulate response data
                        console.log('sending mock resposne body');
                        eventCallback(Buffer.from('{ "message": "mock response body" }'));
                    }
                    if (event === 'end') {
                        // simulate end of response
                        console.log('simulating end of response');
                        eventCallback();
                    }
                }),
            };
            callback(mr);
        }),
    };
};

describe('MojaloopRequests', () => {
    const wso2Auth = new WSO2Auth({ logger: mockLogger({ app: 'post-authorizations-test' }) }, undefined);
    const defaultConf = {
        logger: mockLogger({ app: 'postAuthorizations-test' }, undefined),
        peerEndpoint: '127.0.0.1',
        tls: {
            mutualTLS: {
                enabled: false
            }
        },
        jwsSign: false,
        jwsSignPutParties: false,
        jwsSigningKey: jwsSigningKey,
        wso2Auth,
        dfspId: 'testdfsp',
    };

    it('Sends ISO20022 PUT /parties bodies when ApiType is iso20022', async () => {
        const conf = {
            ...defaultConf,
            apiType: ApiType.ISO20022,
        };

        // mock the http request method so we can see the sent body
        // yeah, this is more complicated than it should be.
        http.request = jest.fn((options, callback) => {
            return getReqMock(options, callback);
        });

        const testMr = new mr(conf);

        const res = await testMr.putParties(putPartiesBody.party.partyIdInfo.partyIdType,
            putPartiesBody.party.partyIdInfo.partyIdentifier,
            putPartiesBody.party.partyIdInfo.partySubIdOrType,
            putPartiesBody,
            'somefsp',
            undefined);

        const reqBody = JSON.parse(res.originalRequest.body);

        // check the correct content type was sent
        expect(res.originalRequest.headers['content-type']).toEqual('application/vnd.interoperability.iso20022.parties+json;version=1.0');

        // check the body was converted to ISO20022
        // note that we dont check that the content of the ISO body is correct, that is up to the tests around the
        // transformer lib. We just check if the body was changed to an iso form by looking for one or two expected
        // values.
        expect(reqBody.Assgnmt).not.toBeUndefined();
        expect(reqBody.Rpt).not.toBeUndefined();
        expect(reqBody.Rpt.OrgnlId).toEqual(`${putPartiesBody.party.partyIdInfo.partyIdType}/${putPartiesBody.party.partyIdInfo.partyIdentifier}`);
    });

    it('Sends FSPIOP PUT /parties bodies when ApiType is fspiop', async () => {
        const conf = {
            ...defaultConf,
            apiType: ApiType.FSPIOP,
        };

        // mock the http request method so we can see the sent body
        // yeah, this is more complicated than it should be.
        http.request = jest.fn((options, callback) => {
            return getReqMock(options, callback);
        });

        const testMr = new mr(conf);

        const res = await testMr.putParties(putPartiesBody.party.partyIdInfo.partyIdType,
            putPartiesBody.party.partyIdInfo.partyIdentifier,
            putPartiesBody.party.partyIdInfo.partySubIdOrType,
            putPartiesBody,
            'somefsp',
            undefined);

        const reqBody = JSON.parse(res.originalRequest.body);

        // check the correct content type was sent
        expect(res.originalRequest.headers['content-type']).toEqual('application/vnd.interoperability.parties+json;version=1.0');

        // check the body was NOT converted to ISO20022
        expect(reqBody).toEqual(putPartiesBody);
    });

    it('Sends ISO20022 PUT /parties error bodies when ApiType is iso20022', async () => {
        const conf = {
            ...defaultConf,
            apiType: ApiType.ISO20022,
        };

        // mock the http request method so we can see the sent body
        // yeah, this is more complicated than it should be.
        http.request = jest.fn((options, callback) => {
            return getReqMock(options, callback);
        });

        const testMr = new mr(conf);

        const res = await testMr.putPartiesError(putPartiesBody.party.partyIdInfo.partyIdType,
            putPartiesBody.party.partyIdInfo.partyIdentifier,
            putPartiesBody.party.partyIdInfo.partySubIdOrType,
            putErrorBody,
            'somefsp',
            undefined);

        const reqBody = JSON.parse(res.originalRequest.body);

        // check the correct content type was sent
        expect(res.originalRequest.headers['content-type']).toEqual('application/vnd.interoperability.iso20022.parties+json;version=1.0');

        // check the body was converted to ISO20022
        // note that we dont check that the content of the ISO body is correct, that is up to the tests around the
        // transformer lib. We just check if the body was changed to an iso form by looking for one or two expected
        // values.
        expect(reqBody.Assgnmt).not.toBeUndefined();
        expect(reqBody.Rpt).not.toBeUndefined();
        expect(reqBody.Rpt.Vrfctn).toEqual(false);
        expect(reqBody.Rpt.Rsn.Cd).toEqual(putErrorBody.errorInformation.errorCode);
    });

    it('Sends FSPIOP PUT /parties error bodies when ApiType is fspiop', async () => {
        const conf = {
            ...defaultConf,
            apiType: ApiType.FSPIOP,
        };

        // mock the http request method so we can see the sent body
        // yeah, this is more complicated than it should be.
        http.request = jest.fn((options, callback) => {
            return getReqMock(options, callback);
        });

        const testMr = new mr(conf);

        const res = await testMr.putPartiesError(putPartiesBody.party.partyIdInfo.partyIdType,
            putPartiesBody.party.partyIdInfo.partyIdentifier,
            putPartiesBody.party.partyIdInfo.partySubIdOrType,
            putErrorBody,
            'somefsp',
            undefined);

        const reqBody = JSON.parse(res.originalRequest.body);

        // check the correct content type was sent
        expect(res.originalRequest.headers['content-type']).toEqual('application/vnd.interoperability.parties+json;version=1.0');

        // check the body was NOT converted to ISO20022
        expect(reqBody).toEqual(putErrorBody);
    });

    it('Sends FSPIOP POST /participants bodies when ApiType is iso20022. Resource type NOT transformed', async () => {
        const conf = {
            ...defaultConf,
            apiType: ApiType.ISO20022,
        };

        // mock the http request method so we can see the sent body
        // yeah, this is more complicated than it should be.
        http.request = jest.fn((options, callback) => {
            return getReqMock(options, callback);
        });

        const testMr = new mr(conf);

        const res = await testMr.postParticipants(postParticipantsBody,'somefsp');

        const reqBody = JSON.parse(res.originalRequest.body);

        // check the correct content type was sent.
        // Note that even though no body transformation happens for participants we do expect the header to be for ISO20022
        expect(res.originalRequest.headers['content-type']).toEqual('application/vnd.interoperability.iso20022.participants+json;version=1.0');

        // check the body was NOT converted to ISO20022
        expect(reqBody).toEqual(postParticipantsBody);
    });

    it('Sends FSPIOP POST /participants bodies when ApiType is fspiop', async () => {
        const conf = {
            ...defaultConf,
            apiType: ApiType.FSPIOP,
        };

        // mock the http request method so we can see the sent body
        // yeah, this is more complicated than it should be.
        http.request = jest.fn((options, callback) => {
            return getReqMock(options, callback);
        });

        const testMr = new mr(conf);

        const res = await testMr.postParticipants(postParticipantsBody, 'somefsp');

        const reqBody = JSON.parse(res.originalRequest.body);

        // check the correct content type was sent
        expect(res.originalRequest.headers['content-type']).toEqual('application/vnd.interoperability.participants+json;version=1.0');

        // check the body was NOT converted to ISO20022
        expect(reqBody).toEqual(postParticipantsBody);
    });
});
