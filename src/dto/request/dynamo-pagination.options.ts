import { DynamoPaginationDefinition } from "./dynamo-pagination.definition";

export class DynamoPaginationOptions {
    table: string;
    index?: string = null;
    secret: string = 'ANY';
    definitions: { [key: string]: DynamoPaginationDefinition };
}