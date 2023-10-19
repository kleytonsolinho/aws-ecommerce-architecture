import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const lambdaRequestId = context.awsRequestId;
  const apiRequestId = event.requestContext.requestId;

  const method = event.httpMethod;

  console.log(
    `API Gateway Request ID: ${apiRequestId} - Lambda Request ID: ${lambdaRequestId}`
  );

  if (event.resource === "/products") {
    if (method === "GET") {
      console.log("Products fetch function - GET /products");

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Products fetch function - GET /products",
        }),
      };
    }
  } else if (event.resource === "/products/{id}") {
    const productId = event.pathParameters!.id as String;
    if (method === "GET" && !!productId) {
      console.log(`Unique product fetch function - GET /products/${productId}`);

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: `Unique product fetch function - GET /products/${productId}`,
        }),
      };
    }
  }

  return {
    statusCode: 400,
    body: JSON.stringify({
      message: "Bad request",
    }),
  };
}
