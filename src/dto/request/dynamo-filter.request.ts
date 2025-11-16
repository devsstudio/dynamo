import { IsArray, IsDefined, IsEnum, IsOptional, IsString, ValidateIf, ValidateNested } from "class-validator";
import { DynamoFilterLogical, DynamoFilterOperator, DynamoFilterType } from "../../enums/enums";
import { Transform, Type } from "class-transformer";

export class DynamoFilterRequest {
    @IsOptional()
    @IsEnum(DynamoFilterType)
    type?: DynamoFilterType = DynamoFilterType.SIMPLE;

    @ValidateIf((val) => val.type !== DynamoFilterType.SUB)
    @IsDefined()
    @IsString()
    attr?: string;

    @ValidateIf((val) => val.type !== DynamoFilterType.SUB)
    @IsDefined()
    val?: DynamoValType;

    @ValidateIf((val) => val.type !== DynamoFilterType.SUB)
    @IsOptional()
    @IsEnum(DynamoFilterOperator)
    opr?: DynamoFilterOperator = DynamoFilterOperator.EQUAL;

    @IsOptional()
    @IsEnum(DynamoFilterLogical)
    @Transform((val) => val.value || DynamoFilterLogical.AND)
    conn?: DynamoFilterLogical = DynamoFilterLogical.AND;

    @ValidateIf((val) => val.type === DynamoFilterType.SUB)
    @IsDefined()
    @IsArray()
    @Type(() => (DynamoFilterRequest))
    @ValidateNested()
    subfilters?: DynamoFilterRequest[] = [];
}


