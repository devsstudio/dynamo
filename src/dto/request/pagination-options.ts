import { PaginationDefinition } from "./pagination-definition";

export class PaginationOptions {
    table: string;
    secret: string = 'ANY';
    definitions: { [key: string]: PaginationDefinition };
}