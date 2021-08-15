const axios = require("axios");
const {config} = require("../../mock.config");
const {should, expect} = require("chai");
const FormData = require('form-data');
const fs = require('fs');

describe('StorageWebService', function () {
    describe('handleUploadFile', function () {
        it('should upload a multipart file', async function () {
            const form = new FormData();
            form.append('music', fs.createReadStream(__dirname + '/../../music.mp3'));
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
            expect(data.urls[0].startsWith('/storage/bfast_test/file')).equal(true);
            expect(data.urls[0].endsWith('music.mp3')).equal(true);
        });
        it('should upload a multipart file and preserve filename', async function () {
            const form = new FormData();
            form.append('music', fs.createReadStream(__dirname + '/../../music.mp3'));
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
            expect(data.urls[0]).equal('/storage/bfast_test/file/music.mp3');
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
            form.append('bfast.txt', Buffer.from('Hello, BFast!'));
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
            expect(data.urls[0]).equal(`/storage/${config.applicationId}/file/bfast.txt`);
        });
        it('should get a file without stream it', async function () {
            const response = await axios.get(
                `http://localhost:${config.port}/storage/${config.applicationId}/file/bfast.txt`,
                {}
            );
            const data = response.data;
            should().exist(data);
            expect(data).equal('Hello, BFast!');
        });
        it('should not return file that not exist', async function () {
            try{
                const response = await axios.get(
                    `http://localhost:${config.port}/storage/${config.applicationId}/file/ethan.txt`,
                    {}
                );
                should().not.exist(response);
            }catch (e){
                const data = e?.response?.data;
                should().exist(data);
                expect(data).eql({
                    message: 'File not found'
                });
            }
        });
    });
});
