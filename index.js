const { pagination } = require("./functions/pagination");

exports.pagination = async function (dynamo, options, parameters) {
  return await pagination(dynamo, options, parameters);
};
