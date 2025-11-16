import { AES, enc } from "crypto-js";
import { marshall } from "@aws-sdk/util-dynamodb";
import { DynamoDB, ExecuteStatementCommandInput } from "@aws-sdk/client-dynamodb";
import { DynamoPaginationOptions } from "../dto/request/dynamo-pagination.options";
import { DynamoPaginationRequest } from "../dto/request/dynamo-pagination.request";
import { DevsStudioDynamoError } from "./error";
import { DynamoFilterRequest } from "../dto/request/dynamo-filter.request";
import { DynamoFilterLogical, DynamoFilterOperator, DynamoFilterType } from "../enums/enums";
import { DynamoPaginationResponse } from "../dto/response/dynamo-pagination.response";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { unmarshallAll } from "../helpers/dynamo.helper";

export class DynamoPagination {

  private dynamodb: DynamoDB;

  constructor(dynamodb: DynamoDB) {
    this.dynamodb = dynamodb;
  }

  columns: string[] = [];
  placeholders: DynamoValType[] = [];
  condition: string = '';

  async pagination(options: DynamoPaginationOptions, params: DynamoPaginationRequest, logs: boolean = false): Promise<DynamoPaginationResponse> {

    options = plainToInstance(DynamoPaginationOptions, options);
    params = plainToInstance(DynamoPaginationRequest, params);

    //Se valida options
    var errors = await validate(options);
    if (errors.length > 0) {
      throw DevsStudioDynamoError.fromValidationErrors(errors);
    }

    //Se valida request
    errors = await validate(params);
    if (errors.length > 0) {
      throw DevsStudioDynamoError.fromValidationErrors(errors);
    }

    if (logs) {
      console.log("Params:", JSON.stringify(params, null, 4));
    }

    //Si hay from desencriptamos
    var from = null;
    if (params.from) {
      try {

        var fromDecoded = decodeURIComponent(params.from);

        var fromDecrypted = AES.decrypt(
          fromDecoded,
          options.secret || DEFAULT_SECRET
        ).toString(enc.Utf8);

        from = JSON.parse(fromDecrypted);
      } catch (e) {
        throw new DevsStudioDynamoError(400, "invalid next key");
      }
    }

    //Definiciones
    for (let definition of options.definitions) {
      if (!definition.hidden) {
        this.columns.push(definition.name);
      }
    }

    this.condition = this.getCondition(options, params.filters);

    var statement = `SELECT "${this.columns.join('", "')}" FROM "${options.table}"`;
    if (options.index) {
      statement += `."${options.index}"`;
    }
    if (this.condition.trim().length > 0) {
      statement += ` WHERE ${this.condition}`;
    }
    if (params.order) {
      statement += ` ORDER BY "${params.order}" ${params.direction}`;
    }

    var stsParams: ExecuteStatementCommandInput = {
      Statement: statement,
      Limit: params.limit || undefined,
      Parameters: this.placeholders.length > 0 ? Object.values(marshall(this.placeholders)) : undefined,
      NextToken: from?.current || null,
    }

    if (logs) {
      console.log(stsParams);
    }

    try {
      const output = await this.dynamodb.executeStatement(stsParams);

      var results: DynamoPaginationResponse = {
        Items: output.Items ? unmarshallAll(output.Items) : [],
      };

      if (from && from?.current) {
        // console.log("from", from);

        var prevEncrypted = AES.encrypt(
          JSON.stringify({
            prev: null,
            current: from.prev,
          }),
          options.secret || DEFAULT_SECRET
        ).toString();
        results.Prev = encodeURIComponent(prevEncrypted);
      }

      //Si hay última key encriptamos
      if (output.NextToken) {
        // console.log("NextToken", results.NextToken);

        var nextEncrypted = AES.encrypt(
          JSON.stringify({
            prev: from ? from.current : null,
            current: output.NextToken,
          }),
          options.secret || DEFAULT_SECRET
        ).toString();

        results.Next = encodeURIComponent(nextEncrypted);
      }

      return results;

    } catch (err: any) {
      if (err.message === 'NextToken does not match request') {
        return {
          Items: [],
        }
      } else {
        throw err;
      }
    }
  }

  getCondition(options: DynamoPaginationOptions, filters: DynamoFilterRequest[]) {
    var condition = '';
    for (let filter of filters) {
      filter = plainToInstance(DynamoFilterRequest, filter);
      //El atributo está definido
      var definition = filter.attr ? this._hasColumn(options, filter.attr) : null;
      if (filter.type === DynamoFilterType.SUB || definition) {
        condition += this._setFilter(options, filter, condition);
      }
    }
    return condition;
  }

  private _setFilter(options: DynamoPaginationOptions, filter: DynamoFilterRequest, condition: string) {

    this._verifyFilterAttribute(options, filter);
    //Procesamos filtro
    return this._processFilter(options, filter, condition);
  }

  private _verifyFilterAttribute(options: DynamoPaginationOptions, filter: DynamoFilterRequest) {
    //Verificamos tipo
    if (filter.type === DynamoFilterType.COLUMN) {
      if (typeof filter.val !== 'string' || !this._hasColumn(options, filter.val)) {
        throw new DevsStudioDynamoError(400, `attribute filter '${filter.val}' is not allowed`);
      }
    }
  }


  private _processFilter(options: DynamoPaginationOptions, filter: DynamoFilterRequest, condition: string) {
    switch (filter.type) {
      case DynamoFilterType.SIMPLE:
        return this._processSimpleFilter(filter, condition);
      case DynamoFilterType.COLUMN:
        return this._processColumnFilter(filter, condition);
      case DynamoFilterType.BETWEEN:
        return this._processBetweenFilter(filter, false, condition);
      case DynamoFilterType.NOT_BETWEEN:
        return this._processBetweenFilter(filter, true, condition);
      case DynamoFilterType.IN:
        return this._processInFilter(filter, false, condition);
      case DynamoFilterType.NOT_IN:
        return this._processInFilter(filter, true, condition);
      case DynamoFilterType.IS:
        return this._processIsFilter(filter, false, condition);
      case DynamoFilterType.NOT_IS:
        return this._processIsFilter(filter, true, condition);
      case DynamoFilterType.SUB:
        return this._processSubFilter(options, filter, condition);
    }
  }

  private _processSimpleFilter(filter: DynamoFilterRequest, condition: string) {

    const conn = this._getConn(filter.conn!, condition);
    const placeholder = this._setPlaceholder(filter.val!!);

    if (filter.opr === DynamoFilterOperator.CONTAINS) {
      return ` ${conn} Contains("${filter.attr}", ${placeholder})`;
    } else {
      return ` ${conn} ("${filter.attr}" ${filter.opr} ${placeholder})`;
    }
  }

  private _processColumnFilter(filter: DynamoFilterRequest, condition: string) {

    const conn = this._getConn(filter.conn!, condition);

    if (filter.opr === DynamoFilterOperator.CONTAINS) {
      return ` ${conn} Contains("${filter.attr}", "${filter.val}")`;
    } else {
      return ` ${conn} ("${filter.attr}" ${filter.opr} "${filter.val}")`;
    }
  }

  private _processBetweenFilter(filter: DynamoFilterRequest, not: boolean, condition: string) {

    if (filter.val !== 'object' || filter.val.length !== 2) {
      throw new DevsStudioDynamoError(
        400,
        `filter value should be a array with two elements, when filter type is ${filter.type}`
      );
    }

    const conn = this._getConn(filter.conn!, condition);
    const placeholder1 = this._setPlaceholder(filter.val[0]);
    const placeholder2 = this._setPlaceholder(filter.val[1]);

    if (not) {
      return ` ${conn} ("${filter.attr}" NOT BETWEEN ${placeholder1} AND ${placeholder2})`;
    } else {
      return ` ${conn} ("${filter.attr}" BETWEEN ${placeholder1} AND ${placeholder2})`;
    }
  }

  private _processInFilter(filter: DynamoFilterRequest, not: boolean, condition: string) {

    if (typeof filter.val !== 'object') {
      throw new DevsStudioDynamoError(
        400,
        `filter value should be a array, when filter type is ${filter.type}`
      );
    }

    //    const vals = filter.val.toString().split(",") as string[];
    const current_placeholders = filter.val!!.map(val => this._setPlaceholder(val)).join(", ");
    const conn = this._getConn(filter.conn!, condition);

    if (not) {
      return ` ${conn} ("${filter.attr}" NOT IN (${current_placeholders}))`;
    } else {
      return ` ${conn} ("${filter.attr}" IN (${current_placeholders}))`;
    }
  }

  private _processIsFilter(filter: DynamoFilterRequest, not: boolean, condition: string) {

    const conn = this._getConn(filter.conn!, condition);

    if (not) {
      return ` ${conn} ("${filter.attr}" IS NOT ${filter.val})`;
    } else {
      return ` ${conn} ("${filter.attr}" IS ${filter.val})`;
    }
  }

  private _processSubFilter(options: DynamoPaginationOptions, filter: DynamoFilterRequest, condition: string) {
    return ` ${this._getConn(filter.conn!, condition)} (${this.getCondition(options, filter.subfilters!)})`;
  }

  private _getConn(conn: DynamoFilterLogical, condition: string) {
    return condition.trim().length > 0 ? conn : "";
  }

  private _setPlaceholder(value: DynamoValType) {
    this.placeholders.push(value);
    return '?';
  };

  private _getColumns(options: DynamoPaginationOptions): string[] {
    return options.definitions.map((def) => def.name);
  }

  private _hasColumn(options: DynamoPaginationOptions, name: string): boolean {
    return options.definitions.some((def) => def.name === name);
  }
}