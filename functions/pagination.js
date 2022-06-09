const { DevsStudioDynamoError } = require("../classes/error");
const CryptoJS = require("crypto-js");

const secret = "any";

exports.pagination = async function (dynamo, options, parameters) {
  console.log("Parameters", parameters);

  //Se agrega el filtro de correo (temporal)
  if (parameters == null) {
    parameters = {};
  }

  //Si hay from desencriptamos
  var from = null;
  if (parameters?.from) {
    try {
      // var fromDecoded = CryptoJS.enc.Hex.parse(
      //   parameters.from
      // ).toString(CryptoJS.enc.Base64);
      // console.log("decoded", fromDecoded);

      var fromDecoded = decodeURIComponent(parameters.from);

      var fromDecrypted = CryptoJS.AES.decrypt(
        fromDecoded,
        options.secret || secret
      ).toString(CryptoJS.enc.Utf8);
      // console.log("decrypted", fromDecrypted);

      from = JSON.parse(fromDecrypted);
    } catch (e) {
      throw new DevsStudioDynamoError(400, "Clave siguiente inválida");
    }
  }

  var projectionExpression = [];
  var keyConditionExpression = [];
  var filterExpression = [];
  var expressionAttributeNames = {};
  var expressionAttributeValues = {};
  for (const [attribute, definition] of Object.entries(options.definitions)) {
    //Agregamos si no es hidden
    if (!definition.hidden) {
      projectionExpression.push("#" + attribute);
    }

    //Verificamos si hay filtro para esta columna
    if (parameters["filter." + attribute]) {
      //Condición
      var condition = "";
      switch (definition.op) {
        case "equal":
          condition = "#" + attribute + " = :" + attribute;
          break;
        case "like":
          condition = "begins_with(#" + attribute + ", :" + attribute + ")";
          break;
        default:
          throw new DevsStudioDynamoError(
            400,
            "Operador inválido: '" + definition.op + "'"
          );
      }

      if (definition.key) {
        keyConditionExpression.push(condition);
      } else {
        filterExpression.push(condition);
      }

      //Agregamos valores
      expressionAttributeValues[":" + attribute] =
        parameters["filter." + attribute];
    }

    expressionAttributeNames["#" + attribute] = attribute;
  }

  if (keyConditionExpression.length === 0) {
    throw new DevsStudioDynamoError(
      400,
      "Debe especificar los filtros para la clave de partición"
    );
  }

  //Verificamos si tiene la clave desde
  var params = {
    TableName: options.table,
    ProjectionExpression: projectionExpression.join(", "),
    KeyConditionExpression: keyConditionExpression.join(" AND "),
    FilterExpression:
      filterExpression.length > 0 ? filterExpression.join(" AND ") : null,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ExclusiveStartKey: from?.current || null,
    Limit: parameters?.limit,
  };

  //Parmámetros
  console.log("Params", params);

  var data = null;
  //
  try {
    data = await dynamo.query(params).promise();

    if (from && from?.current) {
      // console.log("from", from);

      var prevEncrypted = CryptoJS.AES.encrypt(
        JSON.stringify({
          prev: null,
          current: from.prev,
        }),
        options.secret || secret
      ).toString();
      // var prevEncoded = CryptoJS.enc.Base64.parse(prevEncrypted).toString(
      //   CryptoJS.enc.Hex
      // );
      // data.Prev = prevEncoded;
      data.Prev = encodeURIComponent(prevEncrypted);
    }

    //Si hay última key encriptamos
    if (data.LastEvaluatedKey) {
      // console.log("LastEvaluatedKey", data.LastEvaluatedKey);

      var nextEncrypted = CryptoJS.AES.encrypt(
        JSON.stringify({
          prev: from ? from.current : null,
          current: data.LastEvaluatedKey,
        }),
        options.secret || secret
      ).toString();
      // var nextEncoded = CryptoJS.enc.Base64.parse(nextEncrypted).toString(
      //   CryptoJS.enc.Hex
      // );
      // data.Next = nextEncoded;
      data.Next = encodeURIComponent(nextEncrypted);
    }

    delete data.LastEvaluatedKey;

    return data;
  } catch (e) {
    console.log(e);
    if (e.code === "ValidationException") {
      return returnSuccess({
        Items: [],
        Count: 0,
        ScannedCount: 0,
      });
    } else {
      throw new DevsStudioDynamoError(500, "Ha ocurrido un error interno");
    }
  }
};
