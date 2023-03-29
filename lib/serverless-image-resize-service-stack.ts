import { HttpApi } from '@aws-cdk/aws-apigatewayv2';
import { Code, Function, Runtime } from '@aws-cdk/aws-lambda';
import { Bucket } from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations'
import { HttpMethod } from '@aws-cdk/aws-apigatewayv2/lib/http';
import { AnyPrincipal, PolicyStatement, PrincipalBase, PrincipalPolicyFragment } from '@aws-cdk/aws-iam';

export class ServerlessImageResizeServiceStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new Bucket(this, 'ImageBucker')

    const resizeFunction = new Function(this, 'ResizeFunction', {
      runtime: Runtime.NODEJS_16_X,
      handler: 'index.handler',
      code: Code.fromAsset('lambda'),
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      environment: {
        BUCKET_NAME: bucket.bucketName
      }
    })

    const api = new HttpApi(this, 'ImageResizeApi')

    const lambdaIntegration = new HttpLambdaIntegration('Resize', resizeFunction)

    api.addRoutes({
      path: '/resize',
      methods: [HttpMethod.POST],
      integration: lambdaIntegration
    })

    resizeFunction.addToRolePolicy(
      new PolicyStatement({
        actions: ['s3:*'],
        resources: [bucket.bucketArn]
      })
    )

    // Allow lambda to put object
    const putObjectPolicy = new PolicyStatement({
      actions: ['s3:PutObject'],
      resources: [`${bucket.bucketArn}/*`],
      principals: [resizeFunction.grantPrincipal]
    });

    bucket.addToResourcePolicy(putObjectPolicy);

    // Make the bucket public
    const publicBucket = new PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [`${bucket.bucketArn}/*`],
      principals: [new AnyPrincipal()]
    });

    bucket.addToResourcePolicy(publicBucket);
  }
}
