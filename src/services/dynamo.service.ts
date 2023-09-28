import {
    DynamoDB,
    DynamoDBClient,
    GetItemCommand,
    PutItemCommand,
    UpdateItemCommand,
    DeleteItemCommand,
    TransactWriteItem,
    TransactWriteItemsCommand,
    ExecuteStatementCommandOutput,
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


    async query(table: string, expression: string, conditionExpression: string, expressionValues: any[] = null): Promise<ExecuteStatementCommandOutput> {
        var statement = `SELECT ${expression} FROM ${table}`;
        if (conditionExpression.trim().length > 0) {
            statement += ` WHERE ${conditionExpression}`;
        }

        var stsParams: ExecuteStatementCommandInput = {
            Statement: statement,
            Parameters: expressionValues.length > 0 ? Object.values(marshall(expressionValues)) : null,
        }

        const output = await this.dynamodb.executeStatement(stsParams);
        return output;
    }

    async queryOne(table: string, expression: string, conditionExpression: string, expressionValues: any[] = null): Promise<any> {
        var output = await this.query(table, expression, conditionExpression, expressionValues);
        return output.Items.length > 0 ? unmarshall(output.Items[0]) : null;
    }
    async transactWriteItems(items: DynamoWriteItemRequest[]) {

        var transactItems: TransactWriteItem[] = [];
        for (let item of items) {
            transactItems.push({
                [item.type]: {
                    TableName: item.table,
                    Item: marshall(item.item, {
                        convertClassInstanceToMap: true
                    })
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
}
