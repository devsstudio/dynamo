import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { plainToInstance } from "class-transformer";
import { DynamoWriteItemRequest } from "../dto/request/dynamo-write-item.request";
import { DynamoWriteOperationType } from "../enums/enums";

export function construct<T>() {
    type Constructor = new () => T;
    var type: Constructor;
    return type;
}

export function unmarshallAll(items: Record<string, any>[]) {
    var newItems = [];

    for (let item of items) {
        var newItem = unmarshall(item);
        newItems.push(newItem);
    }

    return newItems;
}


export function unmarshallAndConvert<T>(item: Record<string, any>): T {
    var unmarshalled = unmarshall(item);
    return plainToInstance(construct<T>(), unmarshalled);
}

export function mapTransactionUpdateItem(table: string, key: { [key: string]: any }, values: { [key: string]: any }): DynamoWriteItemRequest {

    var updateExpression = [];
    var expressionAttributeNames: { [key: string]: string } = {};
    var expressionAttributeValues: { [key: string]: any } = {};
    for (let [key, value] of Object.entries(values)) {
        updateExpression.push('#' + key + ' = :' + key);
        expressionAttributeNames['#' + key] = key;
        expressionAttributeValues[':' + key] = value;
    }

    return {
        type: DynamoWriteOperationType.UPDATE,
        table: table,
        key: key,
        update_expression: 'SET ' + updateExpression.join(', '),
        expression_attribute_names: expressionAttributeNames,
        expression_attribute_values: expressionAttributeValues,
    }
}