## 各リソースの役割メモ

### notificationTopic

アラートを飛ばすときのSNSトピック。以下のサービスのアラートをチェックする。  

* kmsKey
* vpc
* cache
* database
* web
* streaming
* sideKiq
* alb
* webTargetGroup
* streamingTargetGroup

### kmsKey

暗号化に利用するキー。以下に利用。  

* secretManager

### secretManager

シークレットマネージャー。データベースの諸々に使用。  

* database
* cache

### hostedZone

Route53のホストゾーン。  

### VPC

* VPCエンドポイント
    * S3
    * DynamoDB
* AZ 2つ public private
* VPC Flowlog reject-only retention14

### clientSg

セキュリティグループ

DB、キャッシュに接続するクライアント側に設定するセキュリティグループ

### s3bucket

OACを利用してアクセスの制御を行う。  


