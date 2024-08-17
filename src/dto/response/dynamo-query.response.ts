import { AttributeValue, ConsumedCapacity } from "@aws-sdk/client-dynamodb";

export class DynamoQueryResponse {
    Items: any[] = [];
    ConsumedCapacity?: ConsumedCapacity = null;
    LastEvaluatedKey?: Record<string, AttributeValue> = null;
    NextToken?: string = null;
}