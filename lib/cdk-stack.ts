import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { defaultConfig } from './config';
import { Sns } from 'aws-cdk-lib/aws-ses-actions';
import { SubscriptionProtocol } from 'aws-cdk-lib/aws-sns';
import { CfnDataLakeSettings } from 'aws-cdk-lib/aws-lakeformation';
import { config } from 'process';
import { FlowLogTrafficType, GatewayVpcEndpointAwsService } from 'aws-cdk-lib/aws-ec2';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const notificationTopic = new cdk.aws_sns.Topic(this, 'notification-topic', {
      topicName: 'mastodon-alert'
    });
    if(defaultConfig.AlertingEmail != null) {
      notificationTopic.addSubscription(new cdk.aws_sns_subscriptions.EmailSubscription(defaultConfig.AlertingEmail));
    }
    if(defaultConfig.AlertingHttpsEndpoint) {
      notificationTopic.addSubscription(new cdk.aws_sns_subscriptions.UrlSubscription(defaultConfig.AlertingHttpsEndpoint));
    }

    const kmsKey = new cdk.aws_kms.Key(this, 'database-key');
    const secretManager = new cdk.aws_secretsmanager.Secret(this, 'kms-secret', {
      encryptionKey: kmsKey,
      generateSecretString: {
        excludeCharacters: '\"\@\/\\',
        passwordLength: 30,
      }
    });

    const hostedZone = new cdk.aws_route53.PublicHostedZone(this, 'hostedzone', {
      zoneName: defaultConfig.DomainName,
    });
    const vpc = new cdk.aws_ec2.Vpc(this, 'default-vpc', {
      maxAzs: 2,
      natGateways: 0,
    });
    vpc.addFlowLog('rejectFlowLog', {
      trafficType: FlowLogTrafficType.REJECT
    });
    vpc.addGatewayEndpoint('s3-endpoint', {
      service: GatewayVpcEndpointAwsService.S3,
    });
    vpc.addGatewayEndpoint('s3-endpoint', {
      service: GatewayVpcEndpointAwsService.DYNAMODB,
    });

    // example resource
    // const queue = new sqs.Queue(this, 'CdkQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
