import {after, before} from "mocha";
import {assert, expect, should} from "chai";
import {loadEnv} from "../../utils";
import {handleCreateRules, handleDeleteRules} from "./rules";
import {extractResultFromServer} from "bfast";
import {databaseFactory} from "../../test";

let options;

async function createData() {
    const rule = {
        createProduct: [
            {name: 'xyz', price: 50, status: 'new', id: 'xyz'},
            {name: 'wer', price: 100, status: 'new'},
            {name: 'poi', price: 30, status: 'new'},
            {id: '16b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b', name: '1'},
            {id: 'a', name: '2'},
            {id: 'b', name: '3'},
        ]
    }
    const a = await handleCreateRules(rule, {errors: {}}, databaseFactory(), loadEnv(), null);
    extractResultFromServer(a, 'create', 'Product')
}

async function clearData() {
    const a = await handleDeleteRules({
        deleteProduct: {
            filter: {updatedAt: {$exists: true}}
        }
    }, {errors: {}}, databaseFactory(), loadEnv(), null)
    extractResultFromServer(a, 'delete', 'Product');
}

describe('RulesDeleteController', function () {
    beforeEach(async () => options = loadEnv())
    before(async () => {
        await clearData();
        await createData();
    });
    after(async () => await clearData());
    it('should delete a document by id', async function () {
        const rule = {
            deleteProduct: {
                id: 'xyz',
                return: []
            }
        }
        const results =
            await handleDeleteRules(rule, {errors: {}}, databaseFactory(), options, null);
        should().exist(results.deleteProduct);
        expect(results.deleteProduct[0].id).equal('xyz');
    });
    it('should delete a document by filter', async function () {
        const rule = {
            deleteProduct: {
                filter: {
                    name: 'poi'
                },
                return: []
            }
        }
        const results =
            await handleDeleteRules(rule, {errors: {}}, databaseFactory(), options, null);
        should().exist(results.deleteProduct);
        expect(Array.isArray(results.deleteProduct)).equal(true);
        expect(results.deleteProduct.length).equal(1);
        expect(typeof results.deleteProduct[0].id === "string").equal(true);
    });
    it('should delete documents given many ids in filter', async function () {
        const rule = {
            deleteProduct: {
                filter: {
                    id: {
                        $in: ['16b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b', 'a', 'b']
                    }
                },
                return: []
            }
        }
        const results =
            await handleDeleteRules(rule, {errors: {}}, databaseFactory(), options, null);
        should().exist(results.deleteProduct);
        expect(Array.isArray(results.deleteProduct)).equal(true);
        expect(results.deleteProduct.length).equal(3);
        expect(results.deleteProduct.map(x => x.id)).to.be.members(
            ['16b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b', 'a', 'b']
        );
    });
    it('should not delete objects by empty filter', async function () {
        const rule = {
            deleteProduct: {
                filter: {},
                return: []
            }
        }
        const results =
            await handleDeleteRules(rule, {errors: {}}, databaseFactory(), options, null);
        assert(results.deleteProduct === undefined);
        assert(results.errors !== undefined);
        assert(results.errors['delete.Product']['message'] === 'Empty filter map is not supported in delete rule');
    });
});





