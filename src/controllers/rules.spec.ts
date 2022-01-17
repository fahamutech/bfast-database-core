import {extractDomain, getRulesKey, handleBulkRules, handleCreateRules, handleDeleteRules} from "./rules";
import {assert, expect, should} from "chai";
import {after, before} from "mocha";
import {loadEnv} from "../utils/env";
import {extractResultFromServer} from "bfast";
import {databaseFactory} from "../test";

let options;
const date = new Date()

async function clearData() {
    const a = await handleDeleteRules({
        deleteProduct: {filter: {updatedAt: {$exists: true}}}
    }, {errors: {}},databaseFactory(), loadEnv(), null)
    extractResultFromServer(a, 'delete', 'Product')
}

describe('RulesController', function () {
    describe('getRulesKey', function () {
        it('should return rules keys', async function () {
            const keys = getRulesKey({
                errors: {},
                createtest: {}
            })
            expect(keys).deep.members(['errors', 'createtest'])
        });
        it('should return empty keys when is null', function () {
            const keys = getRulesKey(null)
            expect(keys).deep.members([])
        });
        it('should return empty keys when is undefined', function () {
            const keys = getRulesKey(undefined)
            expect(keys).deep.members([])
        });
        it('should return empty keys when is function', function () {
            // @ts-ignore
            const keys = getRulesKey(() => {
            })
            expect(keys).deep.members([])
        });
        it('should return empty keys when is number', function () {
            // @ts-ignore
            const keys = getRulesKey(1)
            expect(keys).deep.members([])
        });
        it('should return empty keys when is string', function () {
            // @ts-ignore
            const keys = getRulesKey('abc')
            expect(keys).deep.members([])
        });
        it('should return empty keys when is empty object', function () {
            // @ts-ignore
            const keys = getRulesKey({})
            expect(keys).deep.members([])
        });
    });
    describe('extractDomain', function () {
        it('should return a domain from rule', function () {
            const domain = extractDomain('createTest', "create");
            assert(domain === 'Test');
        });

        it('should return null from rule when removeDataInStore is unknown', function () {
            // @ts-ignore
            const domain = extractDomain('CreateTest', "john");
            assert(domain === null);
        });

        it('should return null from rule when rule is unknown', function () {
            // @ts-ignore
            const domain = extractDomain('johnTest', "Create");
            assert(domain === null);
        });

        it('should return null from rule when rule and removeDataInStore is unknown', function () {
            // @ts-ignore
            const domain = extractDomain('johnTest', "john");
            assert(domain === null);
        });
    });
    describe('handleBulkRules', function () {
        beforeEach(() => options = loadEnv())
        after(async ()=> await clearData())
        before(async ()=> await clearData())
        describe('compound', function () {
            before(async function () {
                await handleCreateRules({
                        createProduct: [
                            {name: 'xyz', price: 50, status: 'new', id: 'xyz-id', createdAt: date, updatedAt: date},
                            {name: 'zyx', price: 50, status: 'new', id: 'zyx-id', createdAt: date, updatedAt: date},
                            {name: 'uuu', price: 50, status: 'new', id: 'uuu-id', createdAt: date, updatedAt: date},
                        ]
                    },
                    {errors: {}},databaseFactory(), options, null);
            });
            it('should perform transaction', async function () {
                const results = await handleBulkRules({
                        transaction: {
                            commit: {
                                createProduct: [
                                    {id: 't1', createdAt: date, updatedAt: date, name: 'zxc', price: 100, status: 'new'},
                                    {id: 't2', createdAt: date, updatedAt: date, name: 'mnb', price: 30, status: 'new'},
                                ],
                                updateProduct: {
                                    id: 'xyz-id',
                                    return: [],
                                    update: {
                                        $set: {
                                            name: 'apple',
                                            price: 1000,
                                            updatedAt: date
                                        }
                                    }
                                },
                                deleteProduct: {
                                    id: 'xyz-id'
                                },
                                queryProduct: {
                                    filter: {},
                                    return: []
                                }
                            }
                        }
                    }, {errors: {}}, databaseFactory(),options
                );
                // console.log(results.transaction.commit)
                should().exist(results.transaction);
                should().exist(results.transaction.commit);
                const _r = {...results.transaction.commit}
                delete _r.queryProduct;
                expect(_r).eql({
                    errors: {},
                    // createProduct: [
                    //     {id: 't1'},
                    //     {id: 't2'},
                    // ],
                    // updateProduct: {
                    //     name: 'apple',
                    //     price: 1000,
                    //     status: 'new',
                    //     id: 'xyz-id',
                    //     createdAt: date,
                    //     createdBy: null,
                    //     updatedAt: date
                    // },
                    // deleteProduct: [
                    //     {id: 'xyz-id'}
                    // ],
                });
                should().exist(results.transaction.commit);
            });
            it('should perform transaction when update block is array', async function () {
                const results = await handleBulkRules({
                        transaction: {
                            commit: {
                                createProduct: [
                                    {name: 'zxc', price: 100, status: 'new'},
                                    {name: 'mnb', price: 30, status: 'new'},
                                ],
                                updateProduct: [
                                    {
                                        id: 'uuu-id',
                                        return: [],
                                        update: {
                                            $set: {
                                                name: 'apple',
                                                price: 1000
                                            }
                                        }
                                    },
                                    {
                                        id: 'zyx-id',
                                        return: [],
                                        update: {
                                            $set: {
                                                name: 'nokia',
                                                price: 5000
                                            }
                                        }
                                    }
                                ],
                                deleteProduct: {
                                    id: 'uuu-id'
                                },
                                queryProduct: {
                                    filter: {},
                                    return: []
                                }
                            }
                        }
                    },
                    {errors: {}}, databaseFactory(),options
                );
                should().exist(results.transaction);
                should().exist(results.transaction.commit);
            });
            it('should perform transaction if save to already exist documents', async function () {
                const results = await handleBulkRules({
                        transaction: {
                            commit: {
                                createProduct: [
                                    {id: 'doe', name: 'zxc', price: 100, status: 'new', createdAt: date, updatedAt: date},
                                    {id: 'doe2', name: 'mnb', price: 30, status: 'new', createdAt: date, updatedAt: date},
                                ],
                                updateProduct: {
                                    id: 'xyz-id',
                                    return: [],
                                    update: {
                                        $set: {
                                            name: 'apple',
                                            price: 1000,
                                            updatedAt: date
                                        }
                                    }
                                },
                                queryProduct: {
                                    filter: {},
                                    return: []
                                }
                            }
                        },
                    }, {errors: {}}, databaseFactory(),options
                );
                should().exist(results.transaction);
                should().not.exist(results.errors.transaction);
            });
        });
        describe('delete', function () {
            before(async function () {
                await handleCreateRules({
                        createProduct: [
                            {
                                name: 'xps',
                                price: 50,
                                user: {
                                    email: 'a@a.com'
                                },
                                id: 'xpsid',
                                createdAt: date,
                                updatedAt: date
                            },
                            {
                                name: 'hp',
                                price: 100,
                                user: {
                                    email: 'a@a.com'
                                },
                                id: 'hpip',
                                createdAt: date,
                                updatedAt: date
                            }
                        ]
                    }, {errors: {}}, databaseFactory(),options, null
                );
            });
            it('should delete only matches', async function () {
                const results = await handleBulkRules({
                        transaction: {
                            commit: {
                                deleteProduct: {
                                    filter: {
                                        name: 'xps',
                                        user: {
                                            email: 'a@a.com'
                                        }
                                    }
                                }
                            }
                        }
                    }, {errors: {}}, databaseFactory(),options
                );
                should().exist(results.transaction);
                should().exist(results.transaction.commit);
            });
        });
        describe('update', async function () {
            before(async function () {
                await handleCreateRules({
                        createstocks: [
                            {
                                "product": "aziko 500mg -azithromycin tab",
                                "idOld": "IHg6jrZW4lnPuq68vGKX",
                                "wholesalePrice": 1600,
                                "unit": "tablets",
                                "wholesaleQuantity": 1,
                                "retailPrice": 3000,
                                "category": "medicine",
                                "shelf": "counter",
                                "retailWholesalePrice": 1600,
                                "nhifPrice": 0,
                                "profit": 2150,
                                "purchase": 1350,
                                "quantity": -525,
                                "reorder": 0,
                                "supplier": "samiro",
                                "q_status": "",
                                "times": 2.5925925925925926,
                                "expire": "2020-03-20",
                                "retail_stockcol": "",
                                "stockable": true,
                                "saleable": true,
                                "purchasable": true,
                                "barcode": "",
                                "canExpire": false,
                                "catalog": ["general"],
                                "description": "",
                                "downloadable": false,
                                "downloads": [],
                                "image": "",
                                "metas": {},
                                "updatedAt": "2021-08-25T16:14:50.766Z",
                                "id": "d5rYcAywdw",
                                "createdAt": "2019-10-17T15:51:59.899Z"
                            },
                            {
                                "product": "paracetamol 10*10 tab-panadol pcm",
                                "unit": "tabs",
                                "category": "medicine",
                                "shelf": "counter",
                                "quantity": -37661,
                                "wholesaleQuantity": 100,
                                "q_status": "",
                                "reorder": 300,
                                "supplier": "core pharma ltd",
                                "purchase": 20,
                                "retailPrice": 40,
                                "retailWholesalePrice": 1760,
                                "profit": -135,
                                "times": 0.15625,
                                "expire": "2022-12-30T21:00:00.000Z",
                                "idOld": "sUOTiTdDzh14u74t5DDy",
                                "retail_stockcol": "",
                                "nhifPrice": 20,
                                "wholesalePrice": 2500,
                                "active": true,
                                "canExpire": true,
                                "description": "",
                                "downloadable": false,
                                "downloads": [],
                                "purchasable": true,
                                "saleable": true,
                                "stockable": true,
                                "barcode": "",
                                "catalog": ["general"],
                                "image": "",
                                "metas": {},
                                "updatedAt": "2021-08-26T13:47:20.078Z",
                                "id": "RG6GCCGPDB",
                                "createdAt": "2019-01-15T05:13:57.050Z"
                            }
                        ]
                    },
                    {errors: {}}, databaseFactory(),options, null);
            });
            it('should execute big doc', async function () {
                const rule = {
                    "transaction": {
                        "commit": {
                            "createsales": [
                                {
                                    "amount": 6000,
                                    "discount": 0,
                                    "quantity": 2,
                                    "product": "aziko 500mg -azithromycin tab",
                                    "category": "medicine",
                                    "unit": "tablets",
                                    "channel": "retail",
                                    "date": "2021-10-15",
                                    "idTra": "n",
                                    "customerObject": {"phone": "SYSTEM"},
                                    "soldBy": {"username": "bahati"},
                                    "timer": "2021-10-15T12:31",
                                    "user": "40a2a518-6412-4c24-9dd7-31a4625d0f28",
                                    "sellerObject": {
                                        "username": "bahati",
                                        "lastname": "bahati",
                                        "firstname": "bahati",
                                        "email": "bahati@lbpharmacy"
                                    },
                                    "createdAt": "2021-10-15T09:31:37.782Z",
                                    "updatedAt": "2021-10-15T09:31:37.772Z",
                                    "stock": {
                                        "product": "aziko 500mg -azithromycin tab",
                                        "idOld": "IHg6jrZW4lnPuq68vGKX",
                                        "wholesalePrice": 1600,
                                        "unit": "tablets",
                                        "wholesaleQuantity": 1,
                                        "retailPrice": 3000,
                                        "category": "medicine",
                                        "shelf": "counter",
                                        "retailWholesalePrice": 1600,
                                        "nhifPrice": 0,
                                        "profit": 2150,
                                        "purchase": 1350,
                                        "quantity": -525,
                                        "reorder": 0,
                                        "supplier": "samiro",
                                        "q_status": "",
                                        "times": 2.5925925925925926,
                                        "expire": "2020-03-20",
                                        "retail_stockcol": "",
                                        "stockable": true,
                                        "saleable": true,
                                        "purchasable": true,
                                        "barcode": "",
                                        "canExpire": false,
                                        "catalog": ["general"],
                                        "description": "",
                                        "downloadable": false,
                                        "downloads": [],
                                        "image": "",
                                        "metas": {},
                                        "updatedAt": "2021-08-25T16:14:50.766Z",
                                        "id": "d5rYcAywdw",
                                        "createdAt": "2019-10-17T15:51:59.899Z"
                                    },
                                    "stockId": "d5rYcAywdw",
                                    "cartId": "384891b8-0a06-468d-8ae5-ed54416237e0",
                                    "batch": "e5b8e9c8-7c0e-4584-a236-6c8853338faa",
                                    "id": "e5b8e9c8-7c0e-4584-a236-6c8853338faa",
                                    "return": []
                                },
                                {
                                    "amount": 400,
                                    "discount": 0,
                                    "quantity": 10,
                                    "product": "paracetamol 10*10 tab-panadol pcm",
                                    "category": "medicine",
                                    "unit": "tabs",
                                    "channel": "retail",
                                    "date": "2021-10-15",
                                    "idTra": "n",
                                    "customerObject": {"phone": "SYSTEM"},
                                    "soldBy": {"username": "bahati"},
                                    "timer": "2021-10-15T12:31",
                                    "user": "40a2a518-6412-4c24-9dd7-31a4625d0f28",
                                    "sellerObject": {
                                        "username": "bahati",
                                        "lastname": "bahati",
                                        "firstname": "bahati",
                                        "email": "bahati@lbpharmacy"
                                    },
                                    "createdAt": "2021-10-15T09:31:37.782Z",
                                    "updatedAt": "2021-10-15T09:31:37.772Z",
                                    "stock": {
                                        "product": "paracetamol 10*10 tab-panadol pcm",
                                        "unit": "tabs",
                                        "category": "medicine",
                                        "shelf": "counter",
                                        "quantity": -37661,
                                        "wholesaleQuantity": 100,
                                        "q_status": "",
                                        "reorder": 300,
                                        "supplier": "core pharma ltd",
                                        "purchase": 20,
                                        "retailPrice": 40,
                                        "retailWholesalePrice": 1760,
                                        "profit": -135,
                                        "times": 0.15625,
                                        "expire": "2022-12-30T21:00:00.000Z",
                                        "idOld": "sUOTiTdDzh14u74t5DDy",
                                        "retail_stockcol": "",
                                        "nhifPrice": 20,
                                        "wholesalePrice": 2500,
                                        "active": true,
                                        "canExpire": true,
                                        "description": "",
                                        "downloadable": false,
                                        "downloads": [],
                                        "purchasable": true,
                                        "saleable": true,
                                        "stockable": true,
                                        "barcode": "",
                                        "catalog": ["general"],
                                        "image": "",
                                        "metas": {},
                                        "updatedAt": "2021-08-26T13:47:20.078Z",
                                        "id": "RG6GCCGPDB",
                                        "createdAt": "2019-01-15T05:13:57.050Z"
                                    },
                                    "stockId": "RG6GCCGPDB",
                                    "cartId": "384891b8-0a06-468d-8ae5-ed54416237e0",
                                    "batch": "5853bbda-a8cf-4ba2-afe1-8bd9b2363520",
                                    "id": "5853bbda-a8cf-4ba2-afe1-8bd9b2363520",
                                    "return": []
                                }
                            ],
                            "updatestocks": [
                                {
                                    "id": "d5rYcAywdw",
                                    "return": [],
                                    "update": {"$inc": {"quantity": -2}}
                                },
                                {
                                    "id": "RG6GCCGPDB",
                                    "return": [],
                                    "update": {"$inc": {"quantity": -10}}
                                }
                            ]
                        }
                    },
                    "applicationId": "usP3UIsAh364",
                    "context": {"applicationId": "usP3UIsAh364", "useMasterKey": false, "auth": false, "uid": null}
                };
                const results = await handleBulkRules(
                    rule, {errors: {}}, databaseFactory(),options
                );
                should().exist(results.transaction);
                should().exist(results.transaction.commit);
            });
        });
    });
});