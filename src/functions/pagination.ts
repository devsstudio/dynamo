import { AES } from "crypto-js";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { DevsStudioDynamoError } from "../classes/error";
import { DynamoDB, ExecuteStatementCommandInput } from "@aws-sdk/client-dynamodb";
import { PaginationOperator } from "../enums/enums";
import { PaginationResponse } from "../dto/response/pagination-response";
import { PaginationOptions } from "../dto/request/pagination-options";
import { PaginationParams } from "../dto/request/pagination-params";

// exports.pagination = async function (dynamo, options, parameters) {
//   console.log("Parameters", parameters);

//   //Se agrega el filtro de correo (temporal)
//   if (parameters == null) {
//     parameters = {};
//   }

//   //Si hay from desencriptamos
//   var from = null;
//   if (parameters?.from) {
//     try {
//       // var fromDecoded = CryptoJS.enc.Hex.parse(
//       //   parameters.from
//       // ).toString(CryptoJS.enc.Base64);
//       // console.log("decoded", fromDecoded);

//       var fromDecoded = decodeURIComponent(parameters.from);

//       var fromDecrypted = CryptoJS.AES.decrypt(
//         fromDecoded,
//         options.secret || secret
//       ).toString(CryptoJS.enc.Utf8);
//       // console.log("decrypted", fromDecrypted);

//       from = JSON.parse(fromDecrypted);
//     } catch (e) {
//       throw new DevsStudioDynamoError(400, "Clave siguiente inválida");
//     }
//   }

//   var projectionExpression = [];
//   var keyConditionExpression = [];
//   var filterExpression = [];
//   var expressionAttributeNames = {};
//   var expressionAttributeValues = {};
//   for (const [attribute, definition] of Object.entries(options.definitions)) {
//     //Agregamos si no es hidden
//     if (!definition.hidden) {
//       projectionExpression.push("#" + attribute);
//     }

//     //Verificamos si hay filtro para esta columna
//     if (parameters["filter." + attribute]) {
//       //Condición
//       var condition = "";
//       switch (definition.op) {
//         case "equal":
//           condition = "#" + attribute + " = :" + attribute;
//           break;
//         case "like":
//           condition = "contains(#" + attribute + ", :" + attribute + ")";
//           break;
//         default:
//           throw new DevsStudioDynamoError(
//             400,
//             "Operador inválido: '" + definition.op + "'"
//           );
//       }

//       if (definition.key) {
//         keyConditionExpression.push(condition);
//       } else {
//         filterExpression.push(condition);
//       }

//       //Agregamos valores
//       expressionAttributeValues[":" + attribute] =
//         parameters["filter." + attribute];
//     }

//     expressionAttributeNames["#" + attribute] = attribute;
//   }

//   //Verificamos si tiene la clave desde
//   var params = {
//     TableName: options.table,
//     ProjectionExpression: projectionExpression.join(", "),
//     KeyConditionExpression:
//       keyConditionExpression.length > 0
//         ? keyConditionExpression.join(" AND ")
//         : null,
//     FilterExpression:
//       filterExpression.length > 0 ? filterExpression.join(" AND ") : null,
//     ExpressionAttributeNames: expressionAttributeNames,
//     ExpressionAttributeValues: expressionAttributeValues,
//     ExclusiveStartKey: from?.current || null,
//     Limit: parameters?.limit || null,
//   };

//   //Parmámetros
//   console.log("Params", params);

//   var data = null;
//   //
//   try {
//     if (keyConditionExpression.length > 0) {
//       data = await dynamo.query(params).promise();
//     } else {
//       data = await dynamo.scan(params).promise();
//     }

//     if (from && from?.current) {
//       // console.log("from", from);

//       var prevEncrypted = CryptoJS.AES.encrypt(
//         JSON.stringify({
//           prev: null,
//           current: from.prev,
//         }),
//         options.secret || secret
//       ).toString();
//       // var prevEncoded = CryptoJS.enc.Base64.parse(prevEncrypted).toString(
//       //   CryptoJS.enc.Hex
//       // );
//       // data.Prev = prevEncoded;
//       data.Prev = encodeURIComponent(prevEncrypted);
//     }

//     //Si hay última key encriptamos
//     if (data.LastEvaluatedKey) {
//       // console.log("LastEvaluatedKey", data.LastEvaluatedKey);

//       var nextEncrypted = CryptoJS.AES.encrypt(
//         JSON.stringify({
//           prev: from ? from.current : null,
//           current: data.LastEvaluatedKey,
//         }),
//         options.secret || secret
//       ).toString();
//       // var nextEncoded = CryptoJS.enc.Base64.parse(nextEncrypted).toString(
//       //   CryptoJS.enc.Hex
//       // );
//       // data.Next = nextEncoded;
//       data.Next = encodeURIComponent(nextEncrypted);
//     }

//     delete data.LastEvaluatedKey;

//     return data;
//   } catch (e) {
//     console.log(e);
//     if (e.code === "ValidationException") {
//       return {
//         Items: [],
//         Count: 0,
//         ScannedCount: 0,
//       };
//     } else {
//       throw new DevsStudioDynamoError(500, "Ha ocurrido un error interno");
//     }
//   }
// };

export const pagination = async (dynamodb: DynamoDB, options: PaginationOptions, params: PaginationParams = null, logs = false) => {
  //Se agrega el filtro de correo (temporal)
  if (params == null) {
    params = new PaginationParams();
  }

  if (logs) {
    console.log("Params:", JSON.stringify(params, null, 4));
  }

  //Si hay from desencriptamos
  var from = null;
  if (params.from) {
    try {
      // var fromDecoded = CryptoJS.enc.Hex.parse(
      //   parameters.from
      // ).toString(CryptoJS.enc.Base64);
      // console.log("decoded", fromDecoded);

      var fromDecoded = decodeURIComponent(params.from);

      var fromDecrypted = AES.decrypt(
        fromDecoded,
        options.secret
      ).toString(CryptoJS.enc.Utf8);
      // console.log("decrypted", fromDecrypted);

      from = JSON.parse(fromDecrypted);
    } catch (e) {
      throw new DevsStudioDynamoError(400, "Clave siguiente inválida");
    }
  }

  var columns = [];
  var conditions = [];
  var parameters = [];
  for (let [attribute, definition] of Object.entries(options.definitions)) {
    if (!definition.hidden) {
      columns.push(attribute);
    }

    if (params["filter." + attribute]) {
      var value = params["filter." + attribute];

      //Condición
      var condition = "";
      switch (definition.op) {
        case PaginationOperator.EQUAL:
          condition = `"${attribute}" = ?`;
          break;
        case PaginationOperator.NOT_EQUAL:
          condition = `"${attribute}" <> ?`;
          break;
        case PaginationOperator.LIKE:
          condition = `Contains("${attribute}", ?)`;
          break;
        default:
          throw new DevsStudioDynamoError(
            400,
            "Operador inválido: '" + definition.op + "'"
          );
      }

      //Agregamos parámetros
      parameters.push(value);
      conditions.push(condition);
    }
  }

  var statement = `SELECT "${columns.join('", "')}" FROM ${options.table}`;
  if (conditions.length > 0) {
    statement += ` WHERE ${conditions.join(" AND ")}`;
  }

  var stsParams: ExecuteStatementCommandInput = {
    Statement: statement,
    Limit: params.limit,
    Parameters: parameters.length > 0 ? Object.values(marshall(parameters)) : null,
    NextToken: from?.current || null,
  };

  if (logs) {
    console.log(stsParams);
  }

  const output = await dynamodb.executeStatement(stsParams);
  var results: PaginationResponse = {
    Items: unmarshallAll(output.Items),
    Prev: null,
    Next: null
  }
  if (from && from?.current) {
    // console.log("from", from);

    var prevEncrypted = CryptoJS.AES.encrypt(
      JSON.stringify({
        prev: null,
        current: from.prev,
      }),
      options.secret
    ).toString();
    // var prevEncoded = CryptoJS.enc.Base64.parse(prevEncrypted).toString(
    //   CryptoJS.enc.Hex
    // );
    // results.Prev = prevEncoded;
    results.Prev = encodeURIComponent(prevEncrypted);
  }

  //Si hay última key encriptamos
  if (output.NextToken) {
    // console.log("NextToken", results.NextToken);

    var nextEncrypted = CryptoJS.AES.encrypt(
      JSON.stringify({
        prev: from ? from.current : null,
        current: output.NextToken,
      }),
      options.secret
    ).toString();
    // var nextEncoded = CryptoJS.enc.Base64.parse(nextEncrypted).toString(
    //   CryptoJS.enc.Hex
    // );
    // results.Next = nextEncoded;
    results.Next = encodeURIComponent(nextEncrypted);
  }

  // delete output.LastEvaluatedKey;
  // delete output.NextToken;
  // delete output.$metadata;

  return results;
};

const unmarshallAll = (items: any[]) => {
  var newItems = [];

  for (let item of items) {
    var newItem = unmarshall(item);
    newItems.push(newItem);
  }

  return newItems;
};