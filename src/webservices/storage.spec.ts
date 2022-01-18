import FormData from "form-data";
import fs from "fs";
import axios from "axios";
import {expect, should} from "chai";
import {config} from "../test";

describe('StorageWebService', function () {
    describe('handleUploadFile', function () {
        it('should upload a multipart file', async function () {
            const form = new FormData();
            form.append('music', fs.createReadStream(__dirname + '/../../specs/music.mp3'));
            const response = await axios.post(
                `http://localhost:${config.port}/storage/${config.applicationId}`,
                form,
                {
                    headers: form.getHeaders(),
                }
            );
            const data = response.data;
            should().exist(response);
            expect(response.status).equal(200);
            should().exist(data);
            expect(Array.isArray(data.urls)).equal(true);
            expect(data.urls).length(1);
            expect(data.urls[0].startsWith('/storage/bfast/file')).equal(true);
        });
        it('should upload a multipart file and preserve filename', async function () {
            const form = new FormData();
            form.append('music', fs.createReadStream(__dirname + '/../../specs/music.mp3'));
            const response = await axios.post(
                `http://localhost:${config.port}/storage/${config.applicationId}?pn=true`,
                form,
                {
                    headers: form.getHeaders(),
                }
            );
            const data = response.data;
            should().exist(response);
            expect(response.status).equal(200);
            should().exist(data);
            expect(Array.isArray(data.urls)).equal(true);
            expect(data.urls).length(1);
            expect(data.urls[0]).equal('/storage/bfast/file/musicmp3');
        });
        it('should not upload non multipart request', async function () {
            try {
                const body = {
                    name: 'joshua'
                }
                const response = await axios.post(
                    `http://localhost:${config.port}/storage/${config.applicationId}`,
                    body,
                    {}
                );
                should().not.exist(response);
            } catch (e) {
                const data = e?.response?.data;
                should().exist(data);
                expect(e.response.status).equal(400);
                should().exist(data.message);
                expect(data.message).equal('Accept only multipart request');
            }
        });
        it('should fail if applicationId is not valid', async function () {
            try {
                const body = {
                    name: 'joshua'
                }
                const response = await axios.post(
                    `http://localhost:${config.port}/storage/badId`,
                    body,
                    {}
                );
                should().not.exist(response);
            } catch (e) {
                const data = e?.response?.data;
                should().exist(data);
                expect(e.response.status).equal(401);
                should().exist(data.message);
                expect(data.message).equal('unauthorized');
            }
        });
        it('should fails if applicationId path is not available', async function () {
            try {
                const body = {
                    name: 'joshua'
                }
                const response = await axios.post(
                    `http://localhost:${config.port}/storage`,
                    body,
                    {}
                );
                should().not.exist(response);
            } catch (e) {
                const data = e?.response;
                should().exist(data);
                expect(data.status).equal(404);
                expect(data.statusText).equal('Not Found');
                expect(data.data.includes('Cannot POST /storage')).equal(true);
            }
        });
    });
    describe('handleGetFile', function () {
        before(async function () {
            const form = new FormData();
            form.append('bfast.txt', Buffer.from('Hello, BFast!'),{
                contentType: 'text/plain',
                filename: 'bfast.txt'
            });
            const response = await axios.post(
                `http://localhost:${config.port}/storage/${config.applicationId}?pn=true`,
                form,
                {
                    headers: form.getHeaders(),
                }
            );
            const data = response.data;
            should().exist(data);
            should().exist(data.urls);
            expect(data.urls[0]).equal(`/storage/${config.applicationId}/file/bfasttxt`);
        });
        it('should get a file without stream it', async function () {
            try {
                const response = await axios.get(
                    `http://localhost:${config.port}/storage/${config.applicationId}/file/bfasttxt`,
                    {}
                );
                const data = response.data;
                expect(response?.status).equal(200);
                should().exist(data);
                expect(data).equal('Hello, BFast!');
            } catch (e) {
                throw e;
            }
        });
        it('should not return file that not exist', async function () {
            try {
                const response = await axios.get(
                    `http://localhost:${config.port}/storage/${config.applicationId}/file/ethantxt`,
                    {}
                );
                should().not.exist(response);
            } catch (e) {
                const data = e?.response?.data;
                should().exist(data);
                expect(data).eql({
                    message: 'File not found'
                });
            }
        });
        it('should return file info if ask for header', async function () {
            const response = await axios.head(
                `http://localhost:${config.port}/storage/${config.applicationId}/file/musicmp3`,
                {}
            );
            const data = response?.data;
            should().exist(response);
            expect(response.status).equal(200);
            expect(response.headers['accept-ranges']).equal('bytes');
            expect(response.headers['content-length'] > '3000000').equal(true);

        });
    });
});