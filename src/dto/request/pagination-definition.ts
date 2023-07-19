import { PaginationOperator } from "../../enums/enums";

export class PaginationDefinition {
    op: PaginationOperator;
    key: boolean;
    hidden?: boolean = false;
}