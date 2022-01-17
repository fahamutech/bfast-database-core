import {expect} from "chai";
import {getTypeFromUrl} from "./storage";

describe('StorageController', function () {
    describe('getTypeFromUrl', function () {
        it('should get image type', function () {
            const a = getTypeFromUrl("/j/a.jpg")
            expect(a).equal("image/jpeg")
        });
        it('should get video type', function () {
            const a = getTypeFromUrl("/j/a.mp4")
            expect(a).equal("video/mp4")
        });
        it('should return unknown', function () {
            const a = getTypeFromUrl("/j/a.josh")
            expect(a).equal(null)
        });
    });
});

