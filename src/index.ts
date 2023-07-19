import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { PaginationOptions } from "./dto/request/pagination-options";
import { PaginationParams } from "./dto/request/pagination-params";
import { pagination as paginationfn } from "./functions/pagination";

export const pagination = async function (dynamo: DynamoDB, options: PaginationOptions, parameters: PaginationParams) {
  return await paginationfn(dynamo, options, parameters);
};

