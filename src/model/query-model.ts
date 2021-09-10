export interface QueryModel<T> {
  skip?: number;
  size?: number;
  count?: boolean;
  orderBy?: Array<{ [P in keyof T]: 1 | -1 }>;
  filter?: any;
  return?: Array<string>;
  hashes?: Array<string>;
  _id?: string;
  id?: string;
  cids?: boolean
}
