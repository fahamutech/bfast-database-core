export interface UpdateModel {
  upsert?: boolean;
  update: {
    $set?: {[key: string]: any},
    $inc?: {[key: string]: any}
  }
  filter?: any;
  return?: Array<string>;
  hashes?: Array<string>;
  id?: string;
  cids?: boolean
}
