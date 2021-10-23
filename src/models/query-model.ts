export interface QueryModel<T> {
  skip?: number;
  size?: number;
  count?: boolean;
  orderBy?: Array<{ [key: string]: 1 | -1 }>;
  filter?: any;
  return?: Array<string>;
  hashes?: Array<string>;
  id?: string;
  cids?: boolean
}
