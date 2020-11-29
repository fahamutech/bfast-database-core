// @ts-ignore
import {PassThrough} from 'stream';
import {BFastDatabaseConfigAdapter} from '../bfast.config';

export interface FilesAdapter {

  canHandleFileStream: boolean;
  isS3: boolean;

  /** Responsible for storing the file in order to be retrieved later by its filename
   *
   * @param filename - the filename to save
   * @param data - the buffer of data from the file
   * @param  contentType - the supposed contentType
   * @discussion the contentType can be undefined if the controller was not able to determine it
   * @param options - (Optional) options to be passed to file adapters (S3 File Adapter Only)
   * - tags: object containing key value pairs that will be stored with file
   * - metadata: object containing key value pairs
   * that will be stored with file (https://docs.aws.amazon.com/AmazonS3/latest/user-guide/add-object-metadata.html)
   * @discussion options are not supported by all file adapters. Check the your adapters's documentation for compatibility
   *
   * @return a promise that should fail if the storage didn't succeed
   */
  createFile(filename: string, data: PassThrough, contentType: string, options: any): Promise<string>;

  // createThumbnail(filename: string, data: Buffer, contentType: string, options: Object): Promise<string>;

  /** Responsible for deleting the specified file
   *
   * @param filename - the filename to delete
   *
   * @return a promise that should fail if the deletion didn't succeed
   */
  deleteFile(filename: string): Promise<any>;

  /** Responsible for retrieving the data of the specified file
   *
   * @param filename - the name of file to retrieve
   *
   * @param thumbnail - true if request a thumbnail of an image
   * @return  a promise that should pass with the file data or fail on error
   */
  getFileData(filename: string, thumbnail: boolean): Promise<any>;

  /** Returns an absolute URL where the file can be accessed
   *
   * @param  filename - filename to save content with
   * @param config - configurations
   * @return Absolute URL
   */
  getFileLocation(filename: string, config: BFastDatabaseConfigAdapter): Promise<string>;

  /** Handles Byte-Range Requests for Streaming
   *
   * @param filename - name of the file as saved in storage
   * @param  request - http request object [express.Request]
   * @param response - http response object [express.Response]
   * @param contentType - content type of the file to stream
   *
   * @param thumbnail - true if request a thumbnail of an image
   */

  handleFileStream(filename: any, request: any, response: any, contentType: any, thumbnail: boolean): any;

  /**
   *
   * @param filename - the name of the file to retrieve
   * @param thumbnail - true if you want a thumbnail of an image
   */
  signedUrl(filename: string, thumbnail: boolean): Promise<string>;


  /**
   *
   * @param query - query to filter results
   */
  listFiles(query: { prefix: string, size: number, skip: number, after: string }): Promise<any>;


  /** Responsible for retrieving metadata and tags
   *
   * @param filename - the filename to retrieve metadata
   *
   * @return  a promise that should pass with metadata
   */
  // getMetadata(filename: string): Promise<any> {}

  validateFilename(filename: string): Promise<any>;
}
