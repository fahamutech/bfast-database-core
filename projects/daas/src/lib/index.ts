// import {BfastDatabaseCore} from "./bfast-database-core";
// import {EnvUtil} from "./utils/env.util";
//
// async function start() {
//   const envUtil = new EnvUtil();
//   let isS3Configured = true;
//   const s3Bucket = await envUtil.getEnv(process.env.S3_BUCKET);
//   const s3AccessKey = await envUtil.getEnv(process.env.S3_ACCESS_KEY);
//   const s3SecretKey = await envUtil.getEnv(process.env.S3_SECRET_KEY);
//   const s3Endpoint = await envUtil.getEnv(process.env.S3_ENDPOINT);
//
//   const checker: any[] = [];
//   checker.push(s3Bucket, s3AccessKey, s3SecretKey, s3Endpoint);
//
//   if (checker.length === 0) {
//     isS3Configured = false;
//   } else {
//     checker.forEach(value => {
//       if (!value) {
//         isS3Configured = false;
//       } else if (value.toString() === 'null') {
//         isS3Configured = false;
//       } else if (value.toString() === 'undefined') {
//         isS3Configured = false;
//       } else if (value.toString() === '') {
//         isS3Configured = false;
//       }
//     })
//   }
//
//   return new BfastDatabaseCore().startServer({
//     verifyApplicationId: await envUtil.getEnv(process.env.APPLICATION_ID),
//     masterKey: await envUtil.getEnv(process.env.MASTER_KEY),
//     mongoDbUri: await envUtil.getEnv(process.env.MONGO_URL),
//     port: await envUtil.getEnv(process.env.PORT),
//     // mountPath: await envUtil.getEnv(process.env.MOUNT_PATH),
//     adapters: {
//       s3Storage: isS3Configured
//         ? {
//           bucket: s3Bucket,
//           endPoint: s3Endpoint,
//           secretKey: s3SecretKey,
//           accessKey: s3AccessKey,
//           direct: false,
//         } : undefined,
//     }
//   });
// }
//
// start().catch(reason => {
//   console.log(reason);
//   process.exit(-1);
// });
