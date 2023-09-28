import { IsDefined, IsEnum } from "class-validator";
import { DynamoWriteOperationType } from "../../enums/enums";

export class DynamoWriteItemRequest {

    @IsDefined()
    @IsEnum(DynamoWriteOperationType)
    type: DynamoWriteOperationType;

    @IsDefined()
    table: string;

    @IsDefined()
    item: any;
}


