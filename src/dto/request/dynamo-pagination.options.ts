import { DynamoPaginationDefinition } from "./dynamo-pagination.definition";

export class DynamoPaginationOptions {
    table: string;
    secret: string = 'ANY';
    definitions: { [key: string]: DynamoPaginationDefinition };
}