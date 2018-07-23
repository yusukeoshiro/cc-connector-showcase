# Connector Showcase




### Service Cloudと繋がらなくなった場合:
Service CloudとCommerce Cloud間の連携は、SalesforceのREST APIとCommerce CloudのOCAPIを使っています。
前者はパスワードの有効期限が切れないように設定していますが、後者は3ヶ月に一度有効期限が切れます。
もし、切れた場合は、Contactや、OrderのCreateは出来るが、Synchronizeができなくなる事象が発生します。
その場合は、Commerce CloudのBMユーザーのパスワードの更新し、Service Cloud新しいパスワードを入力してください。

手順はここを参照してください:  [1.5.2 Authentication setting for external systems](https://bitbucket.org/demandware/service-cloud-connector/wiki/SC_Connector_-_Installation_Guide)

**注意1:** Salesforce側の連携ユーザーでこの作業を行ってください。(共有環境では"sccuser@salesforce.com"です。)

**注意2:** Commerce Cloudのパスワードは以下のフォーマットで入れてください。 {PASSWORD}:{OCAPI_CLIENT_ID}

OCAPI_CLIENT_IDはSandboxの場合"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"です。
