import {expect} from "chai";
import {Const} from "./const";

describe('Constants', function () {
    describe('DB_CHANGES_EVENT', function () {
        it('should truly', function () {
            expect(Const.DB_CHANGES_EVENT).equal('_db_changes_');
        });
    });
});