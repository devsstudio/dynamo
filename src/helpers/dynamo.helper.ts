import { unmarshall } from "@aws-sdk/util-dynamodb";
import { plainToInstance } from "class-transformer";

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