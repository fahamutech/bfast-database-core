import {after, before} from "mocha";
import {assert, expect, should} from "chai";
import {handleCreateRules, handleDeleteRules, handleQueryRules, handleUpdateRules} from "./rules";
import {loadEnv} from "../utils/env";
import {extractResultFromServer} from "bfast";

const leo = new Date();
let options;

async function createData() {
    const rule = {
        createProduct: [
            {name: 'xyz', price: 50, status: 'new', id: 'xyz'},
            {name: 'wer', price: 100, status: 'new'},
            {name: 'poi', price: 30, status: 'new'},
            {name: 'poipo', price: 60, status: 'old'},
            {
                id: 'ethan',
                name: 'josh', price: 50, status: 'old', flags: {
                    a: {
                        q: 1,
                        g: 2
                    }
                }
            },
            {id: 'josh', name: 'ethan', price: 60, a: {b: 10}, createdAt: leo, 'updatedAt': leo},
        ]
    }
    const r = await handleCreateRules(rule, {errors: {}}, loadEnv(), null);
    extractResultFromServer(r, 'create', 'Product')
}

async function clearData() {
    const a = await handleDeleteRules({
        deleteProduct: {filter: {updatedAt: {$exists: true}}}
    }, {errors: {}}, loadEnv(), null)
    extractResultFromServer(a, 'delete', 'Product')
}

describe('RulesUpdateController', function () {
    beforeEach(() => options = loadEnv())
    before(async () => {
        await clearData()
        await createData()
    });
    after(async () => await clearData());
    it('should update a document by id', async function () {
        const results = await handleUpdateRules({
                updateProduct: {
                    id: 'xyz',
                    update: {
                        $set: {
                            name: 'apple'
                        }
                    },
                    return: []
                }
            },
            {errors: {}},
            options,
            null
        );
        should().exist(results.updateProduct);
        expect(results.updateProduct.modified).equal(1);
    });
    it('should update a document by id with dates', async function () {
        const results = await handleUpdateRules({
                updateProduct: {
                    id: 'josh',
                    update: {
                        $set: {
                            name: 'ethan'
                        }
                    },
                    return: []
                }
            }, {errors: {}},
            options,
            null
        );
        should().exist(results.updateProduct);
        expect(results.updateProduct.modified).equal(1);
    });
    it('should update a documents by filter', async function () {
        const results = await handleUpdateRules({
                updateProduct: {
                    filter: {
                        status: 'new'
                    },
                    update: {
                        $set: {
                            name: 'apple',
                            status: 'old'
                        }
                    },
                    return: []
                }
            }, {errors: {}},
            options,
            null
        );
        should().exist(results.updateProduct);
        expect(results.updateProduct.modified).equal(3);
    });
    it('should update crossStoreDataOperation documents by filter', async function () {
        const results = await handleUpdateRules({
                updateProduct: [
                    {
                        filter: {
                            status: 'old'
                        },
                        update: {
                            $set: {
                                name: 'apple',
                                status: 'new'
                            }
                        },
                    },
                    {
                        filter: {
                            status: 'new'
                        },
                        update: {
                            $set: {
                                name: 'apple',
                                status: 'old'
                            }
                        },
                    }
                ]
            }, {errors: {}},
            options,
            null
        );
        should().exist(results.updateProduct);
        expect(results.updateProduct.modified).equal(10);
    });
    it('should update many documents by id', async function () {
        const results = await handleUpdateRules({
                updateProduct: [
                    {
                        id: 'xyz',
                        update: {
                            $set: {
                                name: 'apple',
                                status: 'new'
                            }
                        },
                    },
                ]
            }, {errors: {}},
            options,
            null
        );
        should().exist(results.updateProduct);
        expect(results.updateProduct.modified).equal(1);
    });
    it('should not update many documents when empty filter exist', async function () {
        const results = await handleUpdateRules({
                updateProduct: [
                    {
                        filter: {},
                        update: {
                            $set: {
                                name: 'apple',
                                status: 'new'
                            }
                        },
                    }
                ]
            }, {errors: {}},
            options,
            null
        );
        should().not.exist(results.updateProduct);
        should().exist(results.errors);
        expect(results.errors['update.Product']['message']).equal('Empty map is not supported in update rule');
    });
    it('should not update objects by empty filter', async function () {
        const results = await handleUpdateRules({
                updateProduct: {
                    filter: {},
                    update: {
                        $set: {
                            name: 'apple'
                        }
                    },
                    return: []
                }
            }, {errors: {}},
            options,
            null
        );
        assert(results.updateProduct === undefined);
        assert(results.errors !== undefined);
        assert(results.errors['update.Product']['message'] === 'Empty map is not supported in update rule');
    });
    it('should update when empty filter and id is supplied', async function () {
        const results = await handleUpdateRules({
                updateProduct: {
                    id: 'xyz',
                    filter: {},
                    update: {
                        $set: {
                            name: 'apple'
                        }
                    },
                    return: []
                }
            }, {errors: {}},
            options,
            null
        );
        should().exist(results.updateProduct);
        assert(results.updateProduct.modified === 1);
    });
    it('should create document if not exist and upsert is true, with query by id', async function () {
        const _date = new Date().toISOString();
        const results = await handleUpdateRules({
                updateProduct: {
                    id: 'xyz123',
                    update: {
                        $set: {
                            name: 'apple',
                            createdAt: _date,
                            updatedAt: _date,
                        }
                    },
                    upsert: true,
                    return: []
                }
            }, {errors: {}},
            options,
            null
        );
        should().exist(results.updateProduct);
        expect(results.updateProduct.modified).equal(1);
    });
    it('should not create document if not exist and upsert is false, with query by id', async function () {
        const _date = new Date();
        const results = await handleUpdateRules({
                updateProduct: {
                    id: '667yu90',
                    update: {
                        $set: {
                            name: 'doe_apple',
                            createdAt: _date,
                            updatedAt: _date,
                        }
                    },
                    upsert: false,
                    return: []
                }
            }, {errors: {}},
            options,
            null
        );
        should().exist(results.updateProduct);
        expect(results.updateProduct.modified).equal(0)
    });
    it('should create documents if not exist and upsert is true, with query by filter', async function () {
        const results = await handleUpdateRules(
            {
                updateProduct: {
                    filter: {
                        status: 'mixer'
                    },
                    update: {
                        $set: {
                            name: 'apple',
                            createdAt: new Date()
                        }
                    },
                    upsert: true,
                    return: []
                }
            },
            {errors: {}},
            options,
            null
        );
        const r = await handleQueryRules(
            {
                queryProduct: {
                    filter: {
                        status: 'mixer'
                    },
                    return: []
                }
            },
            {errors: {}},
            options,
            null
        );
        should().exist(results.updateProduct);
        expect(results.updateProduct.modified).equal(1);
    });
    it('should increment a number field if $inc operation provided and field exist in a doc ', async function () {
        // const _date = new Date();
        const results = await handleUpdateRules({
                updateProduct: {
                    id: 'josh',
                    update: {
                        $inc: {
                            price: 10
                        }
                    },
                    return: []
                }
            }, {errors: {}},
            options,
            null
        );
        should().exist(results.updateProduct);
        expect(results.updateProduct.modified).equal(1);
    });
    it('should increment a number field if $inc operation provided and field exist in a inner doc ', async function () {
        const results = await handleUpdateRules({
                updateProduct: {
                    id: 'josh',
                    update: {
                        $inc: {
                            a: {
                                b: 1
                            }
                        }
                    },
                    return: []
                }
            }, {errors: {}},
            options,
            null
        );
        should().exist(results.updateProduct);
        expect(results.updateProduct.modified).equal(1);
    });
    it('should increment near and far field in a doc ', async function () {
        // const _date = new Date();
        const results = await handleUpdateRules({
                updateProduct: {
                    id: 'josh',
                    update: {
                        $inc: {
                            price: 10,
                            a: {
                                b: 10
                            }
                        }
                    },
                    return: []
                }
            }, {errors: {}},
            options,
            null
        );
        should().exist(results.updateProduct);
        expect(results.updateProduct.modified).equal(1);
    });
    it('should increment not exist field', async function () {
        const results = await handleUpdateRules({
                updateProduct: {
                    id: 'josh',
                    update: {
                        $inc: {
                            c: 10
                        }
                    },
                    return: []
                }
            }, {errors: {}},
            options,
            null
        );
        should().exist(results.updateProduct);
        expect(results.updateProduct.modified).equal(1);
    });
    it('should increment not exist inner field', async function () {
        const results = await handleUpdateRules({
                updateProduct: {
                    id: 'josh',
                    update: {
                        $set: {
                            updatedAt: leo
                        },
                        $inc: {
                            c: 10,
                            e: {
                                a: 10
                            }
                        }
                    },
                    return: []
                }
            }, {errors: {}},
            options,
            null
        );
        should().exist(results.updateProduct);
        expect(results.updateProduct.modified).equal(1);
    });
    it('should not increment non number field', async function () {
        const results = await handleUpdateRules({
                updateProduct: {
                    id: 'josh',
                    update: {
                        $inc: {
                            name: 10
                        }
                    },
                    return: []
                }
            }, {errors: {}},
            options,
            null
        );
        should().not.exist(results.updateProduct);
        should().exist(results.errors['update.Product']);
    });
    it('should upsert and increment field when upsert is true and use id', async function () {
        const results = await handleUpdateRules({
                updateProduct: {
                    id: 'josh334',
                    upsert: true,
                    update: {
                        $inc: {
                            age: 10
                        }
                    },
                    return: []
                }
            }, {errors: {}},
            options,
            null
        );
        should().exist(results.updateProduct);
        expect(results.updateProduct.modified).equal(1);
    });
    it('should upsert and increment field when upsert is true and use filter', async function () {
        const results = await handleUpdateRules({
                updateProduct: {
                    filter: {
                        name: 'night'
                    },
                    upsert: true,
                    update: {
                        $inc: {
                            age: 10
                        }
                    },
                    return: []
                }
            }, {errors: {}},
            options,
            null
        );
        should().exist(results.updateProduct);
        expect(results.updateProduct.modified).equal(1);
    });
    it('should remove field in a document', async function () {
        const results = await handleUpdateRules({
                updateProduct: {
                    id: 'xyz',
                    update: {
                        $unset: {
                            status: 1
                        }
                    },
                    return: []
                }
            },
            {errors: {}},
            options,
            null
        );
        should().exist(results.updateProduct);
        expect(results.updateProduct.modified).equal(1);
    });
    it('should remove embedded field in a document', async function () {
        const results = await handleUpdateRules({
                updateProduct: {
                    id: 'ethan',
                    update: {
                        $unset: {
                            'flags.a.q': 1
                        }
                    },
                    return: []
                }
            },
            {errors: {}},
            options,
            null
        );
        should().exist(results.updateProduct);
        expect(results.updateProduct.modified).equal(1);
    });
});