#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import "source-map-support/register";
import { ECommerceApiStack } from "../lib/ecommerce-api-stack";
import { EventsDdbStack } from "../lib/events-ddb-stack";
import { OrdersAppLayersStack } from "../lib/orders-app-layers-stack";
import { OrdersAppStack } from "../lib/orders-app-stack";
import { ProductsAppLayersStack } from "../lib/products-app-layers-stack";
import { ProductsAppStack } from "../lib/products-app-stack";

const app = new cdk.App();

const env: cdk.Environment = {
  account: "330263679794",
  region: "us-east-1",
};

const tags = {
  cost: "ECommerce",
  team: "SiecolaCode",
};

const productsAppLayersStack = new ProductsAppLayersStack(
  app,
  "ProductsAppLayers",
  {
    env,
    tags,
  }
);
const eventsDdbStack = new EventsDdbStack(app, "EventsDdb", {
  env,
  tags,
});

const productsAppStack = new ProductsAppStack(app, "ProductsApp", {
  env,
  tags,
  eventsDdb: eventsDdbStack.table,
});
productsAppStack.addDependency(productsAppLayersStack);
productsAppStack.addDependency(eventsDdbStack);

const ordersAppLayersStack = new OrdersAppLayersStack(app, "OrdersAppLayers", {
  env,
  tags,
});

const ordersAppStack = new OrdersAppStack(app, "OrdersApp", {
  env,
  tags,
  productsDdb: productsAppStack.productsDdb,
});
ordersAppStack.addDependency(productsAppStack);
ordersAppStack.addDependency(ordersAppLayersStack);

const ecommerceApiStack = new ECommerceApiStack(app, "ECommerceApi", {
  env,
  tags,
  productsFetchHandler: productsAppStack.productsFetchHandler,
  productsAdminHandler: productsAppStack.productsAdminHandler,
  ordersHandler: ordersAppStack.ordersHandler,
});
ecommerceApiStack.addDependency(productsAppStack);
ecommerceApiStack.addDependency(ordersAppStack);
