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
    if (method === "POST") {
      console.log("Products POST function - POST /products");

      return {
        statusCode: 201,
        body: JSON.stringify({
          message: "Products POST function - POST /products",
        }),
      };
    }
  } else if (event.resource === "/products/{id}") {
    const productId = event.pathParameters!.id as String;
    if (method === "PUT" && !!productId) {
      console.log(`Unique product PUT function - PUT /products/${productId}`);

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: `Unique product PUT function - PUT /products/${productId}`,
        }),
      };
    }

    if (method === "DELETE" && !!productId) {
      console.log(
        `Unique product DELETE function - DELETE /products/${productId}`
      );

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: `Unique product DELETE function - DELETE /products/${productId}`,
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
