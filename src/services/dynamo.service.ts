import {
    DynamoDB,
    DynamoDBClient,
    GetItemCommand,
    PutItemCommand,
    UpdateItemCommand,
    DeleteItemCommand,
    TransactWriteItem,
    TransactWriteItemsCommand,
    ExecuteStatementCommandInput
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { DynamoPagination } from '../classes/dynamo-pagination';
import { DynamoPaginationOptions } from '../dto/request/dynamo-pagination.options';
import { DynamoPaginationRequest } from '../dto/request/dynamo-pagination.request';
import { DynamoConfig } from '../dto/data/dynamo-config';
import { DynamoWriteItemRequest } from '../dto/request/dynamo-write-item.request';
import { DynamoExpressionAttributeNames, DynamoObject } from '../dto/data/dynamo-object';
import { unmarshallAndConvert } from '../helpers/dynamo.helper';
import { DynamoQueryResponse } from '../dto/response/dynamo-query.response';

export class DynamoService {

    protected dynamoClient: DynamoDBClient;
    protected dynamodb: DynamoDB;

    constructor(private readonly config: DynamoConfig = null) {
        this.dynamoClient = new DynamoDBClient(config || {});
        this.dynamodb = new DynamoDB(config || {});
    }

    async getItem<T>(table: string, key: DynamoObject): Promise<T> {
        const getItemCommand = new GetItemCommand({
            TableName: table,
            Key: marshall(key),
        });

        const data = await this.dynamoClient.send(getItemCommand);
        return data.Item ? unmarshallAndConvert<T>(data.Item) : null
    }

    async putItem(table: string, item: any) {
        const putItemCommand = new PutItemCommand({
            TableName: table,
            Item: marshall(item, {
                convertClassInstanceToMap: true
            })
        });

        await this.dynamoClient.send(putItemCommand);
    }

    async deleteItem(table: string, key: DynamoObject) {
        const deleteItemCommand = new DeleteItemCommand({
            TableName: table,
            Key: marshall(key),
        });

        await this.dynamoClient.send(deleteItemCommand);
    }

    async simpleUpdateItem(table: string, key: DynamoObject, item: DynamoObject) {

        var set = [];
        var values: DynamoObject = {};
        var names: DynamoExpressionAttributeNames = {};
        for (let [attribute, value] of Object.entries(item)) {
            set.push(`#${attribute} = :${attribute}`);
            values[`:${attribute}`] = value;
            names[`#${attribute}`] = attribute;
        }

        return await this.updateItem(table, key, 'SET ' + set.join(', '), values, names);
    }

    async updateItem(table: string, key: DynamoObject, updateExpression: string, expressionAttributeValues: DynamoObject = null, expressionAttributeNames: DynamoExpressionAttributeNames = null) {

        const updateItemCommand = new UpdateItemCommand({
            TableName: table,
            Key: marshall(key),
            UpdateExpression: updateExpression,
            ExpressionAttributeValues: marshall(expressionAttributeValues, {
                convertClassInstanceToMap: true
            }),
            ExpressionAttributeNames: expressionAttributeNames,
        });

        return await this.dynamoClient.send(updateItemCommand);
    }


    async query<T>(table: string, expression: string, conditionExpression: string, expressionValues: any[] = null, nextToken: string = null): Promise<DynamoQueryResponse<T>> {
        var statement = `SELECT ${expression} FROM ${table}`;
        if (conditionExpression.trim().length > 0) {
            statement += ` WHERE ${conditionExpression}`;
        }

        var stsParams: ExecuteStatementCommandInput = {
            Statement: statement,
            Parameters: expressionValues.length > 0 ? Object.values(marshall(expressionValues)) : null,
            NextToken: nextToken
        }

        const output = await this.dynamodb.executeStatement(stsParams);
        return {
            Items: output.Items?.map(x => unmarshall(x) as T) || [],
            LastEvaluatedKey: output.LastEvaluatedKey,
            NextToken: output.NextToken,
            ConsumedCapacity: output.ConsumedCapacity
        };
    }

    async queryAll<T, X>(table: string, expression: string, conditionExpression: string, expressionValues: any[] = null, mapFn: (item: T) => X): Promise<X[]> {
        var items: X[] = [];

        var output = await this.query<T>(table, expression, conditionExpression, expressionValues);
        items.push(...output.Items.map(mapFn));

        while (output.LastEvaluatedKey) {
            output = await this.query<T>(table, expression, conditionExpression, expressionValues, output.NextToken);
            items.push(...output.Items.map(mapFn));
        }

        return items;
    }

    async queryAllWithCallback<T>(table: string, expression: string, conditionExpression: string, expressionValues: any[] = null, callback: (item: T) => void) {
        var output = await this.query<T>(table, expression, conditionExpression, expressionValues);
        for (let item of output.Items) {
            callback(item);
        }
        while (output.LastEvaluatedKey) {
            output = await this.query<T>(table, expression, conditionExpression, expressionValues, output.NextToken);
            for (let item of output.Items) {
                callback(item);
            }
        }
    }

    async queryOne<T>(table: string, expression: string, conditionExpression: string, expressionValues: any[] = null): Promise<T | null> {
        var output = await this.query<T>(table, expression, conditionExpression, expressionValues);
        return output.Items.length > 0 ? output.Items[0] : null;
    }
    async transactWriteItems(items: DynamoWriteItemRequest[]) {

        var transactItems: TransactWriteItem[] = [];
        for (let item of items) {
            transactItems.push({
                [item.type]: {
                    TableName: item.table,
                    Item: item.item ? marshall(item.item, {
                        convertClassInstanceToMap: true
                    }) : null,
                    Key: item.key ? marshall(item.key) : null,
                    UpdateExpression: item.update_expression ? item.update_expression : null,
                    ExpressionAttributeNames: item.expression_attribute_names ? item.expression_attribute_names : null,
                    ExpressionAttributeValues: item.expression_attribute_values ? marshall(item.expression_attribute_values) : null,
                }
            });
        }

        const transactWriteItemsCommand = new TransactWriteItemsCommand({
            TransactItems: transactItems
        });

        await this.dynamoClient.send(transactWriteItemsCommand);
    }

    // async getPaginated(options: PaginationOptions, params: PaginationParams): Promise<any> {
    //     const data = await pagination(this.dynamodb, options, params);
    //     return data;
    // }

    async getPaginated(options: DynamoPaginationOptions, params: DynamoPaginationRequest, logs: boolean = false): Promise<any> {
        var dynamoPagination = new DynamoPagination(this.dynamodb);
        const data = await dynamoPagination.pagination(options, params, logs);
        return data;
    }

    getClient(): DynamoDBClient {
        return this.dynamoClient;
    }
}
