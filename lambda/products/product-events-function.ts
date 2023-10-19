import { Callback, Context } from "aws-lambda";
import { DynamoDB } from "aws-sdk";
import * as AWSXRay from "aws-xray-sdk";
import { ProductEvent } from "/opt/nodejs/productEventsLayer";

AWSXRay.captureAWS(require("aws-sdk"));

const eventsDdb = process.env.EVENTS_DDB! as string;
const ddbClient = new DynamoDB.DocumentClient();

export async function handler(
  event: ProductEvent,
  context: Context,
  callback: Callback
): Promise<void> {
  // TODO - to be removed
  console.log("Received event:", event);
  console.log(`Lambda requestId: ${context.awsRequestId}`);

  await createEvent(event);

  callback(
    null,
    JSON.stringify({
      productEventCreated: true,
      message: "Product event created successfully",
    })
  );
}

function createEvent(event: ProductEvent) {
  const timestamp = Date.now();
  const ttl = ~~(timestamp / 1000) + 5 * 60; // 5 minutes from now

  return ddbClient
    .put({
      TableName: eventsDdb,
      Item: {
        pk: `#product_${event.productCode}`,
        sl: `${event.eventType}#${timestamp}`,
        email: event.email,
        createdAt: timestamp,
        requestId: event.requestId,
        eventType: event.eventType,
        info: {
          productId: event.productId,
          productPrice: event.productPrice,
        },
        ttl,
      },
    })
    .promise();
}
