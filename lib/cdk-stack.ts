import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { defaultConfig } from './config';
import { Sns } from 'aws-cdk-lib/aws-ses-actions';
import { SubscriptionProtocol } from 'aws-cdk-lib/aws-sns';
import { CfnDataLakeSettings } from 'aws-cdk-lib/aws-lakeformation';
import { config } from 'process';
import { FlowLogTrafficType, GatewayVpcEndpointAwsService } from 'aws-cdk-lib/aws-ec2';
import { BucketAccessControl } from 'aws-cdk-lib/aws-s3';
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

    const clientSg = new cdk.aws_ec2.SecurityGroup(this, 'client-sg', {
      vpc: vpc
    });

    const s3bucket = new cdk.aws_s3.Bucket(this, 's3-bucket', {
      blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL,
    });
    // OACの設定  https://zenn.dev/thyt_lab/articles/d6423c883882b7
    const cfnOriginAccessControl = new cdk.aws_cloudfront.CfnOriginAccessControl(this, 'OriginAccessControl', {
      originAccessControlConfig: {
          name: 'OriginAccessControlS3Bucket',
          originAccessControlOriginType: 's3',
          signingBehavior: 'always',
          signingProtocol: 'sigv4',
          description: 'Access Control',
      },
    });
    const cloudFrontDistribution = new cdk.aws_cloudfront.Distribution(this, 'cloudfrontDistribution', {
      defaultBehavior: {
        origin: new cdk.aws_cloudfront_origins.S3Origin(s3bucket),
      },
    });
    const bucketPolicyStatement = new cdk.aws_iam.PolicyStatement({
      actions: ['s3:GetObject'],
      effect: cdk.aws_iam.Effect.ALLOW,
      principals: [
          new cdk.aws_iam.ServicePrincipal('cloudfront.amazonaws.com')
      ],
      resources: [`${s3bucket.bucketArn}/*`]
    });
    bucketPolicyStatement.addCondition('StringEquals', {
      'AWS:SourceArn': `arn:aws:cloudfront::${cdk.Stack.of(this).account}:distribution/${cloudFrontDistribution.distributionId}`
    });
    s3bucket.addToResourcePolicy(bucketPolicyStatement);

    // CloudFront設定
    const cfnDistribution = cloudFrontDistribution.node.defaultChild as cdk.aws_cloudfront.CfnDistribution;
    cfnDistribution.addPropertyOverride('DistributionConfig.Origins.0.OriginAccessControlId', cfnOriginAccessControl.getAtt('Id'));
    cfnDistribution.addPropertyOverride('DistributionConfig.Origins.0.DomainName', s3bucket.bucketRegionalDomainName);
    cfnDistribution.addOverride('Properties.DistributionConfig.Origins.0.S3OriginConfig.OriginAccessIdentity', "");
    cfnDistribution.addPropertyDeletionOverride('DistributionConfig.Origins.0.CustomOriginConfig');

    new cdk.aws_s3_deployment.BucketDeployment(this, 'CDKReactDeployPractice', {
      sources: [cdk.aws_s3_deployment.Source.asset('<appPath>')],
      destinationBucket: s3bucket,
      distribution: cloudFrontDistribution,
      distributionPaths: ['/*']
    })

    // example resource
    // const queue = new sqs.Queue(this, 'CdkQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
