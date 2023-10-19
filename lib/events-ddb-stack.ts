import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

import { Construct } from "constructs";

export class EventsDdbStack extends cdk.Stack {
  readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.table = new dynamodb.Table(this, "EventsDdb", {
      tableName: "events",
      removalPolicy: cdk.RemovalPolicy.DESTROY, // delete table when stack is deleted
      partitionKey: {
        name: "pk",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "sk",
        type: dynamodb.AttributeType.STRING,
      },
      timeToLiveAttribute: "ttl",
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1, // default is 5
      writeCapacity: 1, // default is 5
    });
  }
}
