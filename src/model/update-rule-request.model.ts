export interface UpdateRuleRequestModel {
  id?: string;
  upsert?: boolean;
  filter?: any;
  update?: { $set?: {[K: string]: any }, $inc?: {[k: string]: number}};
  return?: string[];
  options?: {[key: string]: any}
}
