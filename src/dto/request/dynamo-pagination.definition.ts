import { IsBoolean, IsDefined, IsOptional, IsString } from "class-validator";

export class DynamoPaginationDefinition {

    @IsDefined()
    @IsString()
    name!: string;

    @IsDefined()
    @IsBoolean()
    key!: boolean;

    @IsOptional()
    @IsBoolean()
    hidden?: boolean = false;
}