import { AttributeValue, ConsumedCapacity } from "@aws-sdk/client-dynamodb";

export class DynamoQueryResponse<T> {
    Items!: T[];
    ConsumedCapacity?: ConsumedCapacity;
    LastEvaluatedKey?: Record<string, AttributeValue>;
    NextToken?: string;
}