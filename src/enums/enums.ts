export enum DynamoWriteOperationType {
    PUT = "Put",
    UPDATE = "Update",
    DELETE = "Delete"
}

export enum DynamoFilterType {
    SIMPLE = "SIMPLE",
    COLUMN = "COLUMN",
    IS = "IS",
    NOT_IS = "NOT_IS",
    BETWEEN = "BETWEEN",
    NOT_BETWEEN = "NOT_BETWEEN",
    IN = "IN",
    NOT_IN = "NOT_IN",
    SUB = "SUB"
}

export enum DynamoFilterOperator {
    EQUAL = "=",
    NOT_EQUAL = "<>",
    GREATER_THAN = ">",
    GREATER_OR_EQUAL_THAN = ">=",
    LESS_THAN = "<",
    LESS_OR_EQUAL_THAN = "<=",
    CONTAINS = "CONTAINS"
}

export enum DynamoFilterLogical {
    AND = "AND",
    OR = "OR",
}

export enum DynamoPaginationDirection {
    ASC = "ASC",
    DESC = "DESC",
}