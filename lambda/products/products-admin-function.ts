import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { DynamoDB } from "aws-sdk";
import { Product, ProductRepository } from "/opt/nodejs/productsLayer";

const productsDdb = process.env.PRODUCTS_DDB! as string;
const ddbClient = new DynamoDB.DocumentClient();
const productRepository = new ProductRepository(ddbClient, productsDdb);

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

      const product = JSON.parse(event.body!) as Product;
      const productCreated = await productRepository.createProduct(product);

      return {
        statusCode: 201,
        body: JSON.stringify(productCreated),
      };
    }
  } else if (event.resource === "/products/{id}") {
    const productId = event.pathParameters!.id as string;
    if (method === "PUT" && !!productId) {
      console.log(`Unique product PUT function - PUT /products/${productId}`);

      try {
        const product = JSON.parse(event.body!) as Product;
        const productUpdated = await productRepository.updateProduct(
          productId,
          product
        );

        return {
          statusCode: 200,
          body: JSON.stringify(productUpdated),
        };
      } catch (ConditionalCheckFailedException) {
        return {
          statusCode: 404,
          body: "Product not found",
        };
      }
    }

    if (method === "DELETE" && !!productId) {
      console.log(
        `Unique product DELETE function - DELETE /products/${productId}`
      );

      try {
        const product = await productRepository.deleteProduct(productId);
        return {
          statusCode: 200,
          body: JSON.stringify(product),
        };
      } catch (error) {
        console.error((<Error>error).message);

        return {
          statusCode: 404,
          body: (<Error>error).message,
        };
      }
    }
  }

  return {
    statusCode: 400,
    body: JSON.stringify({
      message: "Bad request",
    }),
  };
}
