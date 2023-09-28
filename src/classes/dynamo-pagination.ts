import { AES, enc } from "crypto-js";
import { marshall } from "@aws-sdk/util-dynamodb";
import { DynamoDB, ExecuteStatementCommandInput } from "@aws-sdk/client-dynamodb";
import { DynamoPaginationOptions } from "../dto/request/dynamo-pagination.options";
import { DynamoPaginationRequest } from "../dto/request/dynamo-pagination.request";
import { DevsStudioDynamoError } from "./error";
import { DynamoFilterRequest } from "../dto/request/dynamo-filter.request";
import { DynamoFilterOperator, DynamoFilterType } from "../enums/enums";
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
  placeholders: string[] = [];
  condition: string = '';

  async pagination(options: DynamoPaginationOptions, params: DynamoPaginationRequest = null, logs = false): Promise<DynamoPaginationResponse> {
    //Se agrega el filtro de correo (temporal)
    if (params == null) {
      params = new DynamoPaginationRequest();
    }

    validate(options);
    validate(params);


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
          options.secret
        ).toString(enc.Utf8);

        from = JSON.parse(fromDecrypted);
      } catch (e) {
        throw new DevsStudioDynamoError(400, "invalid next key");
      }
    }

    //Definiciones
    for (let [column, definition] of Object.entries(options.definitions)) {
      if (!definition.hidden) {
        this.columns.push(column);
      }
    }

    this.condition = this.getCondition(options, params.filters);

    var statement = `SELECT "${this.columns.join('", "')}" FROM ${options.table}`;
    if (this.condition.trim().length > 0) {
      statement += ` WHERE ${this.condition}`;
    }

    var stsParams: ExecuteStatementCommandInput = {
      Statement: statement,
      Limit: params.limit,
      Parameters: this.placeholders.length > 0 ? Object.values(marshall(this.placeholders)) : null,
      NextToken: from?.current || null,
    }

    if (logs) {
      console.log(stsParams);
    }

    try {
      const output = await this.dynamodb.executeStatement(stsParams);

      var results: DynamoPaginationResponse = {
        Items: unmarshallAll(output.Items),
        Prev: null,
        Next: null
      }
      if (from && from?.current) {
        // console.log("from", from);

        var prevEncrypted = AES.encrypt(
          JSON.stringify({
            prev: null,
            current: from.prev,
          }),
          options.secret
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
          options.secret
        ).toString();

        results.Next = encodeURIComponent(nextEncrypted);
      }

      return results;

    } catch (err: any) {
      if (err.message === 'NextToken does not match request') {
        return {
          Items: [],
          Prev: null,
          Next: null
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
      var definition = options.definitions[filter.attr];
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
      if (!options.definitions[filter.val]) {
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
    if (filter.opr === DynamoFilterOperator.CONTAINS) {
      return (
        " " +
        this._getConn(filter.conn, condition) +
        " Contains(" +
        filter.attr +
        ", " +
        this._setPlaceholder(filter.val) +
        ")"
      );
    } else {
      return (
        " " +
        this._getConn(filter.conn, condition) +
        " (" +
        filter.attr +
        " " +
        filter.opr +
        " " +
        this._setPlaceholder(filter.val) +
        ")"
      );
    }
  }

  private _processColumnFilter(filter: DynamoFilterRequest, condition: string) {
    if (filter.opr === DynamoFilterOperator.CONTAINS) {
      return (
        " " +
        this._getConn(filter.conn, condition) +
        " Contains(" +
        filter.attr +
        ", " +
        filter.val +
        ")"
      );
    } else {
      return (
        " " +
        this._getConn(filter.conn, condition) +
        " (" +
        filter.attr +
        " " +
        filter.opr +
        " " +
        filter.val +
        ")"
      );
    }
  }

  private _processBetweenFilter(filter: DynamoFilterRequest, not: boolean, condition: string) {

    //Hacemos split de los campos
    var vals = filter.val.split(",");

    //Debe tener dos valores siempre
    if (vals.length !== 2) {
      throw new DevsStudioDynamoError(400,
        `filter value should be an string with two elements separated by comma, when filter type is ${filter.type}`
      );
    }

    //Creamos
    if (not) {
      return (
        " " +
        this._getConn(filter.conn, condition) +
        " (" +
        filter.attr +
        " NOT BETWEEN " +
        this._setPlaceholder(vals[0]) +
        " AND " +
        this._setPlaceholder(vals[1]) +
        ")"
      );
    } else {
      return (
        " " +
        this._getConn(filter.conn, condition) +
        " (" +
        filter.attr +
        " BETWEEN " +
        this._setPlaceholder(vals[0]) +
        " AND " +
        this._setPlaceholder(vals[1]) +
        ")"
      );
    }
  }

  private _processInFilter(filter: DynamoFilterRequest, not: boolean, condition: string) {

    var vals = filter.val.split(",");

    var current_placeholders = [];
    //Cada elemento no debe ser array
    for (var j = 0; j < vals.length; j++) {
      current_placeholders.push(
        this._setPlaceholder(vals[j])
      );
    }

    //Creamos
    if (not) {
      return (
        " " +
        this._getConn(filter.conn, condition) +
        " (" +
        filter.attr +
        " NOT IN (" +
        current_placeholders.join(", ") +
        "))"
      );
    } else {
      return (
        " " +
        this._getConn(filter.conn, condition) +
        " (" +
        filter.attr +
        " IN (" +
        current_placeholders.join(", ") +
        "))"
      );
    }
  }

  private _processIsFilter(filter: DynamoFilterRequest, not: boolean, condition: string) {
    //Creamos
    if (not) {
      return (
        " " +
        this._getConn(filter.conn, condition) +
        " (" +
        filter.attr +
        " IS NOT " + filter.val + ")"
      );
    } else {
      return (
        " " +
        this._getConn(filter.conn, condition) +
        " (" +
        filter.attr +
        " IS " + filter.val + ")"
      );
    }
  }

  private _processSubFilter(options: DynamoPaginationOptions, filter: DynamoFilterRequest, condition: string) {
    return (
      " " +
      this._getConn(filter.conn, condition) +
      " (" +
      this.getCondition(options, filter.subfilters) +
      ")"
    );
  }

  private _getConn(conn: any, condition: string) {
    return condition.trim().length > 0 ? conn : "";
  }

  private _setPlaceholder(value: string) {
    this.placeholders.push(value);
    return '?';
  };
}