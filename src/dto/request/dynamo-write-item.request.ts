import { IsDefined, IsEnum, IsOptional } from "class-validator";
import { DynamoWriteOperationType } from "../../enums/enums";

export class DynamoWriteItemRequest {

    @IsDefined()
    @IsEnum(DynamoWriteOperationType)
    type: DynamoWriteOperationType;

    @IsDefined()
    table: string;

    @IsOptional()
    item?: any = null;

    @IsOptional()
    key?: { [key: string]: any } = null;

    @IsOptional()
    update_expression?: string = null;

    @IsOptional()
    expression_attribute_names?: { [key: string]: string } = null;

    @IsOptional()
    expression_attribute_values?: { [key: string]: any } = null;
}


