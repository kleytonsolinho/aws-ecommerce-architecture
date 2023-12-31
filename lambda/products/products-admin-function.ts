import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { CognitoIdentityServiceProvider, DynamoDB, Lambda } from "aws-sdk";
import * as AWSXRay from "aws-xray-sdk";
import { AuthInfoService } from "/opt/nodejs/authUserInfo";
import { ProductEvent, ProductEventType } from "/opt/nodejs/productEventsLayer";
import { Product, ProductRepository } from "/opt/nodejs/productsLayer";

AWSXRay.captureAWS(require("aws-sdk"));

const productsDdb = process.env.PRODUCTS_DDB! as string;
const productEventsFunctionName = process.env
  .PRODUCT_EVENTS_FUNCTION! as string;
const ddbClient = new DynamoDB.DocumentClient();
const lambdaClient = new Lambda();
const cognitoIdentityServiceProvider = new CognitoIdentityServiceProvider();
const authInfoService = new AuthInfoService(cognitoIdentityServiceProvider);

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

  const userEmail = await authInfoService.getUserInfo(
    event.requestContext.authorizer!
  );

  if (event.resource === "/products") {
    if (method === "POST") {
      console.log("Products POST function - POST /products");

      const product = JSON.parse(event.body!) as Product;
      const productCreated = await productRepository.createProduct(product);

      const responseEvent = await sendProductEvent(
        productCreated,
        ProductEventType.CREATED,
        userEmail,
        lambdaRequestId
      );

      console.log(`Product event sent: ${JSON.stringify(responseEvent)}`);

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

        const responseEvent = await sendProductEvent(
          productUpdated,
          ProductEventType.UPDATED,
          userEmail,
          lambdaRequestId
        );

        console.log(`Product event sent: ${JSON.stringify(responseEvent)}`);

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
        const productDeleted = await productRepository.deleteProduct(productId);

        const responseEvent = await sendProductEvent(
          productDeleted,
          ProductEventType.DELETED,
          userEmail,
          lambdaRequestId
        );

        console.log(`Product event sent: ${JSON.stringify(responseEvent)}`);

        return {
          statusCode: 200,
          body: JSON.stringify(productDeleted),
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

function sendProductEvent(
  product: Product,
  eventType: ProductEventType,
  email: string,
  lambdaRequestId: string
) {
  const event: ProductEvent = {
    email,
    eventType,
    productCode: product.code,
    productId: product.id,
    productPrice: product.price,
    requestId: lambdaRequestId,
  };

  return lambdaClient
    .invoke({
      FunctionName: productEventsFunctionName,
      Payload: JSON.stringify(event),
      InvocationType: "Event",
    })
    .promise();
}
