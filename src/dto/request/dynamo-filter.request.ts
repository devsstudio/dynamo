import { IsArray, IsDefined, IsEnum, IsOptional, ValidateIf, ValidateNested } from "class-validator";
import { DynamoFilterLogical, DynamoFilterOperator, DynamoFilterType } from "../../enums/enums";
import { Type } from "class-transformer";

export class DynamoFilterRequest {
    @IsOptional()
    @IsEnum(DynamoFilterType)
    type?: DynamoFilterType = DynamoFilterType.SIMPLE;

    @ValidateIf((val) => val.type === DynamoFilterType.SUB)
    @IsDefined()
    attr?: string = null;

    @ValidateIf((val) => val.type === DynamoFilterType.SUB)
    @IsDefined()
    val?: string = null;

    @ValidateIf((val) => val.type !== DynamoFilterType.SUB)
    @IsOptional()
    @IsEnum(DynamoFilterOperator)
    opr?: DynamoFilterOperator = DynamoFilterOperator.EQUAL;

    @IsOptional()
    @IsEnum(DynamoFilterLogical)
    conn?: DynamoFilterLogical = DynamoFilterLogical.AND;

    @ValidateIf((val) => val.type === DynamoFilterType.SUB)
    @IsDefined()
    @IsArray()
    @Type(() => (DynamoFilterRequest))
    @ValidateNested()
    subfilters?: DynamoFilterRequest[] = [];
}


