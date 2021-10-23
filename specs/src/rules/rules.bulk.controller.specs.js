const {mongoRepSet, config} = require('../../mock.config');
const {before, after} = require('mocha');
const {should, expect} = require('chai');
const {handleCreateRules, handleBulkRule} = require("../../../dist");

describe('Bulk', function () {
    let mongoMemoryReplSet;
    before(async function () {
        mongoMemoryReplSet = mongoRepSet();
        await mongoMemoryReplSet.start();
    });
    after(async function () {
        await mongoMemoryReplSet.stop();
    });
    describe('compound', function () {
        before(async function () {
            await handleCreateRules({
                    createProduct: [
                        {name: 'xyz', price: 50, status: 'new', id: 'xyz-id', createdAt: 'leo', updatedAt: 'leo'},
                        {name: 'zyx', price: 50, status: 'new', id: 'zyx-id', createdAt: 'leo', updatedAt: 'leo'},
                        {name: 'uuu', price: 50, status: 'new', id: 'uuu-id', createdAt: 'leo', updatedAt: 'leo'},
                    ]
                },
                {errors: {}},
                config,
                null);
        });
        it('should perform bulk', async function () {
            const results = await handleBulkRule({
                    transaction: {
                        commit: {
                            createProduct: [
                                {id: 't1', createdAt: 'leo', updatedAt: 'leo', name: 'zxc', price: 100, status: 'new'},
                                {id: 't2', createdAt: 'leo', updatedAt: 'leo', name: 'mnb', price: 30, status: 'new'},
                            ],
                            updateProduct: {
                                id: 'xyz-id',
                                return: [],
                                update: {
                                    $set: {
                                        name: 'apple',
                                        price: 1000,
                                        updatedAt: 'leo'
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
                }, {errors: {}},
                config
            );
            // console.log(results.bulk.commit)
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
                //     createdAt: 'leo',
                //     createdBy: null,
                //     updatedAt: 'leo'
                // },
                // deleteProduct: [
                //     {id: 'xyz-id'}
                // ],
            });
            should().exist(results.transaction.commit);
            // should().exist(results.transaction.commit.queryProduct);
            // should().exist(results.transaction.commit.updateProduct);
            // expect(results.transaction.commit.updateProduct.name).equal('apple');
            // expect(results.transaction.commit.updateProduct.price).equal(1000);
            // expect(results.transaction.commit.updateProduct.id).equal('xyz-id');
            // should().exist(results.transaction.commit.queryProduct);
            // should().exist(results.transaction.commit.deleteProduct);
            // expect(typeof results.transaction.commit.deleteProduct[0].id).equal('string');
            // expect(Array.isArray(results.transaction.commit.createProduct)).equal(true);
            // expect(Array.isArray(results.transaction.commit.queryProduct)).equal(true);
            // expect(results.transaction.commit.createProduct).length(2);
            // expect(results.transaction.commit.queryProduct).length(5);
        });
        it('should perform bulk when update block is array', async function () {
            const results = await handleBulkRule({
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
                {errors: {}},
                config
            );
            should().exist(results.transaction);
            should().exist(results.transaction.commit);
            // should().exist(results.transaction.commit.createProduct);
            // should().exist(results.transaction.commit.queryProduct);
            // should().exist(results.transaction.commit.updateProduct);
            // expect(Array.isArray(results.transaction.commit.updateProduct)).equal(true);
            // expect(results.transaction.commit.updateProduct).length(2);
            // expect(results.transaction.commit.updateProduct[0].name).equal('apple');
            // expect(results.transaction.commit.updateProduct[0].price).equal(1000);
            // expect(results.transaction.commit.updateProduct[0].id).equal('uuu-id');
            // expect(results.transaction.commit.updateProduct[1].name).equal('nokia');
            // expect(results.transaction.commit.updateProduct[1].price).equal(5000);
            // expect(results.transaction.commit.updateProduct[1].id).equal('zyx-id');
            // should().exist(results.transaction.commit.queryProduct);
            // should().exist(results.transaction.commit.deleteProduct);
            // expect(results.transaction.commit.deleteProduct[0].id).equal('uuu-id');
            // expect(Array.isArray(results.transaction.commit.createProduct)).equal(true);
            // expect(Array.isArray(results.transaction.commit.queryProduct)).equal(true);
            // expect(results.transaction.commit.createProduct).length(2);
            // expect(results.transaction.commit.queryProduct).length(6);
        });
        it('should perform bulk if save to already exist documents', async function () {
            const results = await handleBulkRule({
                    transaction: {
                        commit: {
                            createProduct: [
                                {id: 'doe', name: 'zxc', price: 100, status: 'new', createdAt: 'leo', updatedAt: 'leo'},
                                {id: 'doe2', name: 'mnb', price: 30, status: 'new', createdAt: 'leo', updatedAt: 'leo'},
                            ],
                            updateProduct: {
                                id: 'xyz-id',
                                return: [],
                                update: {
                                    $set: {
                                        name: 'apple',
                                        price: 1000,
                                        updatedAt: 'leo'
                                    }
                                }
                            },
                            queryProduct: {
                                filter: {},
                                return: []
                            }
                        }
                    },
                }, {errors: {}},
                config
            );
            should().exist(results.transaction);
            should().not.exist(results.errors.transaction);
            // const _r = {...results.transaction.commit}
            // delete _r.queryProduct;
            // expect(_r).eql({
            //     errors: {},
            //     createProduct: [
            //         {id: 'doe'},
            //         {id: 'doe2'},
            //     ],
            //     updateProduct: null
            // });
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
                            createdAt: 'leo',
                            updatedAt: 'leo'
                        },
                        {
                            name: 'hp',
                            price: 100,
                            user: {
                                email: 'a@a.com'
                            },
                            id: 'hpip',
                            createdAt: 'leo',
                            updatedAt: 'leo'
                        }
                    ]
                }, {errors: {}},
                config,
                null
            );
        });
        it('should delete only matches', async function () {
            const results = await handleBulkRule({
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
                }, {errors: {}},
                config
            );
            should().exist(results.transaction);
            should().exist(results.transaction.commit);
            // const _r = {...results.transaction.commit}
            // expect(_r).eql({
            //     errors: {},
            //     deleteProduct: [
            //         {id: 'xpsid'}
            //     ],
            // });
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
                {errors: {}},
                config,
                null);
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
            const results = await handleBulkRule(
                rule,
                {errors: {}},
                config
            );
            // console.log(results);
            // should().exist(results.transaction);
            // should().exist(results.transaction.commit);
            // const _r = {...results.transaction.commit}
            // expect(_r).eql({
            //     errors: {},
            //     deleteProduct: [
            //         {id: 'xpsid'}
            //     ],
            // });
        });
    });
});
