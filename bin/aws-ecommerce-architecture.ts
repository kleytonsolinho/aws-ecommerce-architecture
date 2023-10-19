#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import "source-map-support/register";
import { ECommerceApiStack } from "../lib/ecommerce-api-stack";
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

const productsAppStack = new ProductsAppStack(app, "ProductsApp", {
  env,
  tags,
});
const ecommerceApiStack = new ECommerceApiStack(app, "ECommerceApi", {
  env,
  tags,
  productsFetchHandler: productsAppStack.productsFetchHandler,
});
ecommerceApiStack.addDependency(productsAppStack);
