import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { DynamoDB, SNS } from "aws-sdk";
import * as AWSXRay from "aws-xray-sdk";
import { v4 as uuidv4 } from "uuid";
import {
  Envelope,
  OrderEvent,
  OrderEventType,
} from "/opt/nodejs/orderEventsLayer";
import {
  CarrierType,
  OrderProductResponse,
  OrderRequest,
  OrderResponse,
  PaymentType,
  ShippingType,
} from "/opt/nodejs/ordersApiLayer";
import { Order, OrderRepository } from "/opt/nodejs/ordersLayer";
import { Product, ProductRepository } from "/opt/nodejs/productsLayer";

AWSXRay.captureAWS(require("aws-sdk"));

const ordersDdb = process.env.ORDERS_DDB! as string;
const productsDdb = process.env.PRODUCTS_DDB! as string;
const orderEventsTopicArn = process.env.ORDER_EVENTS_TOPIC_ARN! as string;

const ddbClient = new DynamoDB.DocumentClient();
const snsClient = new SNS();

const orderRepository = new OrderRepository(ddbClient, ordersDdb);
const productRepository = new ProductRepository(ddbClient, productsDdb);

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod;
  const apiRequestId = event.requestContext.requestId;
  const lambdaRequestId = context.awsRequestId;

  console.log(
    `API Gateway Request ID: ${apiRequestId} - Lambda Request ID: ${lambdaRequestId}`
  );

  if (method === "GET") {
    console.log("GET /orders");

    if (event.queryStringParameters) {
      const email = event.queryStringParameters!.email as string;
      const orderId = event.queryStringParameters!.orderId as string;

      if (email) {
        if (orderId) {
          try {
            const order = await orderRepository.getOrderByEmailAndOrderId(
              email,
              orderId
            );

            return {
              statusCode: 200,
              body: JSON.stringify(convertToOrderResponse(order)),
            };
          } catch (error) {
            console.log((<Error>error).message);

            return {
              statusCode: 404,
              body: (<Error>error).message,
            };
          }
        } else {
          const orders = await orderRepository.getOrdersByEmail(email);

          return {
            statusCode: 200,
            body: JSON.stringify(orders.map(convertToOrderResponse)),
          };
        }
      }
    } else {
      const orders = await orderRepository.getAllOrders();

      return {
        statusCode: 200,
        body: JSON.stringify(orders.map(convertToOrderResponse)),
      };
    }
  }

  if (method === "POST") {
    console.log("POST /orders");
    const orderRequest = JSON.parse(event.body!) as OrderRequest;
    const products = await productRepository.getProductsByIds(
      orderRequest.productsIds
    );

    if (products.length === orderRequest.productsIds.length) {
      const order = buildOrder(orderRequest, products);
      const orderCreatedPromise = orderRepository.createOrder(order);

      const eventResultPromise = sendOrderEvent(
        order,
        OrderEventType.CREATED,
        lambdaRequestId
      );

      const [, eventResult] = await Promise.all([
        orderCreatedPromise,
        eventResultPromise,
      ]);

      console.log(
        ` Order created event sent - OrderId: ${order.sk} - MessageId: ${eventResult.MessageId}`
      );

      const orderResponse = convertToOrderResponse(order);

      return {
        statusCode: 201,
        body: JSON.stringify(orderResponse),
      };
    } else {
      return {
        statusCode: 404,
        body: "Some product was not found",
      };
    }
  }

  if (method === "DELETE") {
    console.log("DELETE /orders");

    const email = event.queryStringParameters!.email! as string;
    const orderId = event.queryStringParameters!.orderId! as string;

    try {
      const orderDeleted = await orderRepository.deleteOrder(email, orderId);

      const eventResult = await sendOrderEvent(
        orderDeleted,
        OrderEventType.DELETED,
        lambdaRequestId
      );

      console.log(
        ` Order deleted event sent - OrderId: ${orderDeleted.sk} - MessageId: ${eventResult.MessageId}`
      );

      const orderResponse = convertToOrderResponse(orderDeleted);

      return {
        statusCode: 200,
        body: JSON.stringify(orderResponse),
      };
    } catch (error) {
      console.log((<Error>error).message);

      return {
        statusCode: 404,
        body: (<Error>error).message,
      };
    }
  }

  return {
    statusCode: 400,
    body: "Bad Request",
  };
}

function sendOrderEvent(
  order: Order,
  eventType: OrderEventType,
  lambdaRequestId: string
) {
  const productCodes: string[] = [];

  order.products.forEach((product) => {
    productCodes.push(product.code);
  });

  const orderEvent: OrderEvent = {
    email: order.pk,
    orderId: order.sk!,
    shipping: {
      type: order.shipping.type,
      carrier: order.shipping.carrier,
    },
    billing: {
      payment: order.billing.payment,
      totalPrice: order.billing.totalPrice,
    },
    productCodes: productCodes,
    requestId: lambdaRequestId,
  };

  const envelope: Envelope = {
    eventType: eventType,
    data: JSON.stringify(orderEvent),
  };

  return snsClient
    .publish({
      TopicArn: orderEventsTopicArn,
      Message: JSON.stringify(envelope),
    })
    .promise();
}

function convertToOrderResponse(order: Order): OrderResponse {
  const orderProducts: OrderProductResponse[] = [];

  order.products.forEach((product) => {
    orderProducts.push({
      code: product.code,
      price: product.price,
    });
  });

  const orderResponse: OrderResponse = {
    email: order.pk,
    id: order.sk!,
    createdAt: order.createdAt!,
    products: orderProducts,
    billing: {
      payment: order.billing.payment as PaymentType,
      totalPrice: order.billing.totalPrice,
    },
    shipping: {
      type: order.shipping.type as ShippingType,
      carrier: order.shipping.carrier as CarrierType,
    },
  };

  return orderResponse;
}

function buildOrder(orderRequest: OrderRequest, products: Product[]): Order {
  const orderProducts: OrderProductResponse[] = [];
  let totalPrice = 0;

  products.forEach((product) => {
    totalPrice += product.price;
    orderProducts.push({
      code: product.code,
      price: product.price,
    });
  });

  const order: Order = {
    pk: orderRequest.email,
    sk: uuidv4(),
    createdAt: Date.now().toString(),
    billing: {
      payment: orderRequest.paymentType,
      totalPrice,
    },
    shipping: {
      type: orderRequest.shipping.type,
      carrier: orderRequest.shipping.carrier,
    },
    products: orderProducts,
  };

  return order;
}
