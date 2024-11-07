const { mockAxios, mockGetReply } = require('#test/unit/utils');
const { request } = require('#src/lib/httpRequester/index');

describe('request Tests -->', () => {
    beforeEach(() => {
        mockAxios.reset();
    });

    test('should throw error on wrong content-type, and pass original statusCode', async () => {
        expect.hasAssertions();
        const route = '/xxx';
        const statusCode = 401;
        const data = 'Some error';
        const headers = { 'content-type': 'text/html' };
        mockGetReply({ route, statusCode, data, headers });

        await request({ uri:`http://test.com${route}` })
            .catch(err => {
                expect(err).toBeInstanceOf(Error);
                expect(err.message.startsWith('Invalid content-type')).toBe(true);
                expect(err.statusCode).toBe(statusCode);
            });
    });
});
