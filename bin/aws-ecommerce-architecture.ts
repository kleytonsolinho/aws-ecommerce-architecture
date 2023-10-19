#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import "source-map-support/register";
import { ECommerceApiStack } from "../lib/ecommerce-api-stack";
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
const productsAppStack = new ProductsAppStack(app, "ProductsApp", {
  env,
  tags,
});
productsAppStack.addDependency(productsAppLayersStack);

const ecommerceApiStack = new ECommerceApiStack(app, "ECommerceApi", {
  env,
  tags,
  productsFetchHandler: productsAppStack.productsFetchHandler,
  productsAdminHandler: productsAppStack.productsAdminHandler,
});
ecommerceApiStack.addDependency(productsAppStack);
