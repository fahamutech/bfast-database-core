import httpStatus from 'http-status-codes';

export function verifyMethod(request: any, response: any, next: any): void {
    if (request.method === 'POST') {
        next();
    } else {
        response.status(httpStatus.FORBIDDEN).json({message: 'HTTP method not supported'});
    }
}

export function verifyBodyData(request: any, response: any, next: any): void {
    const body = request.body;
    if (!body) {
        response.status(httpStatus.BAD_REQUEST).json({message: 'require non empty rule blocks request'});
    } else if (Object.keys(body).length === 0) {
        response.status(httpStatus.BAD_REQUEST).json({message: 'require non empty rule blocks request'});
    } else {
        delete body.context;
        next();
    }
}

// export function authJwk(options: BFastOptions): FunctionsModel {
//     return {
//         path: '/jwk',
//         method: 'GET',
//         onRequest: (request, response) => {
//             if (options.rsaPublicKeyInJson) {
//                 response.status(200).json(options.rsaPublicKeyInJson);
//             } else {
//                 response.status(httpStatus.EXPECTATION_FAILED).json({message: 'fail to retrieve public key'});
//             }
//         }
//     }
// }

