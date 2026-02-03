## [1.5.1](https://github.com/reaandrew/snakes-and-ladders/compare/v1.5.0...v1.5.1) (2026-02-03)

### Bug Fixes

* **frontend:** prevent duplicate player when creator joins game ([e134a91](https://github.com/reaandrew/snakes-and-ladders/commit/e134a91f841eb01a2545a237caa7583947483fc2))

## [1.5.0](https://github.com/reaandrew/snakes-and-ladders/compare/v1.4.0...v1.5.0) (2026-02-03)

### Features

* migrate backend to Go on EC2 with Auto Scaling ([528f7f5](https://github.com/reaandrew/snakes-and-ladders/commit/528f7f5e282541d3f72c224196456198eddbe7e4))

### Bug Fixes

* **infra:** add EC2/VPC, ELB, Auto Scaling IAM permissions for GitHub Actions ([775be48](https://github.com/reaandrew/snakes-and-ladders/commit/775be487d640aed392e3d6da171d888b8ef4d919))
* **infra:** add missing ELB, CloudWatch, and logs IAM permissions ([23ac367](https://github.com/reaandrew/snakes-and-ladders/commit/23ac3674ca8277e958a54ce0442fd1b4e33f8083))
* **infra:** add S3 backend and EC2 IAM permissions to aws_setup ([476269a](https://github.com/reaandrew/snakes-and-ladders/commit/476269af66a6aca08bc544f25d504409b80ec28b))

## [1.4.0](https://github.com/reaandrew/snakes-and-ladders/compare/v1.3.0...v1.4.0) (2026-02-01)

### Features

* **admin:** add admin dashboard with game monitoring ([9d4ba33](https://github.com/reaandrew/snakes-and-ladders/commit/9d4ba33a519772176bc2d7ba9c9f7a51661cbfe6))
* **ci:** add comprehensive security testing to CI pipeline ([96e3a29](https://github.com/reaandrew/snakes-and-ladders/commit/96e3a29c0a69ab9b2cfc5e59fbc32d78b49ec2b0))
* **ui:** redesign mobile layout with big dice and top dropdown menu ([f4ec79f](https://github.com/reaandrew/snakes-and-ladders/commit/f4ec79f1e0bfdfedee4044341c4cf2259d51a6a4))

### Bug Fixes

* **aws_setup:** add KMS, WAFv2, and extended logs permissions ([68836f1](https://github.com/reaandrew/snakes-and-ladders/commit/68836f11b8121ccd76c6743f88848767dc6cb729))
* **aws_setup:** add skip comments to KMS policy ([671d453](https://github.com/reaandrew/snakes-and-ladders/commit/671d453b28f69ba9161a2a9607d4aec77e248d24))
* **ci:** add Checkov and tfsec config to skip excessive security checks ([84ac3b5](https://github.com/reaandrew/snakes-and-ladders/commit/84ac3b5a43a553f0a8d02dd41f63f7d2a6327b8f))
* **infra:** add Checkov skip comments for AWS API limitations ([78dd7f0](https://github.com/reaandrew/snakes-and-ladders/commit/78dd7f0daf9ab8152b9e3a8f8f5e356dbef9a1be))
* **infra:** add DynamoDB UpdateContinuousBackups permission ([ea6fb04](https://github.com/reaandrew/snakes-and-ladders/commit/ea6fb0413ece999881dbc54521d05493e50a1b7b))
* **infra:** add KMS Encrypt/Decrypt permissions for Lambda env vars ([c4d70db](https://github.com/reaandrew/snakes-and-ladders/commit/c4d70dbcce9c97651f90890cc8b86d14ed5b400c))
* **infra:** add Lambda PutFunctionConcurrency permission ([fa369cd](https://github.com/reaandrew/snakes-and-ladders/commit/fa369cd466ceef2be4be9b2f2c56c01876dfc8f2))
* **infra:** add missing IAM permissions for deploy ([5caf940](https://github.com/reaandrew/snakes-and-ladders/commit/5caf9402a582f24737b49196204d32ddf729fa4d))
* **infra:** fix remaining 7 Checkov failures ([9645b19](https://github.com/reaandrew/snakes-and-ladders/commit/9645b1932ecb074d52d997e08457af668d0e76c4))
* **infra:** implement security controls instead of suppressing checks ([bef5c52](https://github.com/reaandrew/snakes-and-ladders/commit/bef5c524e43992b3c704e81aade511b6f6fa76ee))
* **infra:** move checkov skip comments inside resource blocks ([8249130](https://github.com/reaandrew/snakes-and-ladders/commit/8249130b8a17437fe25c42cbf910d7d92e9167d8))
* **infra:** use inline skip comments instead of config files ([4008a34](https://github.com/reaandrew/snakes-and-ladders/commit/4008a341f1a90be28ef44787fe2656f68535f37f))
* **security:** add encryption, logging, WAF, and X-Ray tracing ([b28fe37](https://github.com/reaandrew/snakes-and-ladders/commit/b28fe37978e5d7a029281dd8a029af619c04ea58))
* **websocket:** add game state sync on device wake from sleep ([b3248b5](https://github.com/reaandrew/snakes-and-ladders/commit/b3248b5c84b38d4f5d875b52b21766e044953e58))

## [1.3.0](https://github.com/reaandrew/snakes-and-ladders/compare/v1.2.0...v1.3.0) (2026-02-01)

### Features

* **ui:** add 3D dice, mobile stats sheet, and loading improvements ([ec1ddb5](https://github.com/reaandrew/snakes-and-ladders/commit/ec1ddb5adb4cbc8603c74504a9cc0a103b364e75))

## [1.2.0](https://github.com/reaandrew/snakes-and-ladders/compare/v1.1.0...v1.2.0) (2026-02-01)

### Features

* comprehensive UI/UX overhaul with WebSocket fallback ([f9e67b9](https://github.com/reaandrew/snakes-and-ladders/commit/f9e67b9f9c87f81cdd9999718619c8e5714160b3))

## [1.1.0](https://github.com/reaandrew/snakes-and-ladders/compare/v1.0.1...v1.1.0) (2026-01-31)

### Features

* **ui:** responsive game board with mobile-first dice roller ([4ea2b22](https://github.com/reaandrew/snakes-and-ladders/commit/4ea2b22fe6317845133fdbbc6d116643f6beaff3))

## [1.0.1](https://github.com/reaandrew/snakes-and-ladders/compare/v1.0.0...v1.0.1) (2026-01-31)

### Bug Fixes

* prevent duplicate player when creator joins via WebSocket ([7d01a7b](https://github.com/reaandrew/snakes-and-ladders/commit/7d01a7baf9fd9f7e0fb8e59b2440504b9c873ec0))

## 1.0.0 (2026-01-31)

### ⚠ BREAKING CHANGES

* Initial release

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>

### Features

* **frontend:** add snake/ladder rendering and fix cell numbering ([a0bd213](https://github.com/reaandrew/snakes-and-ladders/commit/a0bd2131ed395fd74e3d37adf1f7a0268770a11a))
* implement multiplayer Snakes and Ladders game ([9b181ea](https://github.com/reaandrew/snakes-and-ladders/commit/9b181ea43fd17fe9a2e75cbe7840aa3db64efe28))
* **infra:** flatten terraform, add custom domain snakes.ruster.io ([74f3712](https://github.com/reaandrew/snakes-and-ladders/commit/74f37129d01ed9a1aa9b4c0fc46c6036e56c11c2))

### Bug Fixes

* **backend:** use CommonJS format for Lambda compatibility ([744ccdd](https://github.com/reaandrew/snakes-and-ladders/commit/744ccdd9f3db1d642cc4cc0f4d920d947caf2d42))
* **ci:** add concurrency control to prevent parallel runs ([e8fc36b](https://github.com/reaandrew/snakes-and-ladders/commit/e8fc36b4509965557e638f7c2b676d15c56991fa))
* **ci:** build frontend during deploy with API URLs from terraform ([9640f39](https://github.com/reaandrew/snakes-and-ladders/commit/9640f3907951765a21552a7685c27ad7e9dde6eb))
* **ci:** build shared package before tests and lint ([b5e3c46](https://github.com/reaandrew/snakes-and-ladders/commit/b5e3c46cc0c78c443637bf86d0c4784322df9ac5))
* **ci:** fix S3 path and make quality jobs block deploy ([d91f46e](https://github.com/reaandrew/snakes-and-ladders/commit/d91f46eb1f878bf4b095ae3d470ae00b838bea26))
* **ci:** fix workflow syntax error ([cf31337](https://github.com/reaandrew/snakes-and-ladders/commit/cf31337921a4a17f5795b6eed8e9cb3b02b4ebd4))
* **ci:** make SonarQube and Semgrep optional ([30d0431](https://github.com/reaandrew/snakes-and-ladders/commit/30d043167634b6866f5e75b5e40164ab0000a7d9))
* **ci:** remove sonarqube from deploy dependencies ([67a140b](https://github.com/reaandrew/snakes-and-ladders/commit/67a140b2888481d72248f0cf554208694da78850))
* **ci:** run SonarQube and Semgrep in parallel after tests ([80a9097](https://github.com/reaandrew/snakes-and-ladders/commit/80a909726e19896c13a159b8fb76ee53aceaf5ee))
* **ci:** use PAT for semantic release ([886a76e](https://github.com/reaandrew/snakes-and-ladders/commit/886a76ecc418008d8eb770fab24c2b348fa75e7e))
* **infra:** add back us-east-1 provider to clean orphaned state ([13155c8](https://github.com/reaandrew/snakes-and-ladders/commit/13155c8447c3b7e4ce8efba5137b3a5941f372b6))
* **infra:** add missing IAM permissions for CI deploy ([291482f](https://github.com/reaandrew/snakes-and-ladders/commit/291482f019553ddd4c676398997b997e40781f29))
* **infra:** fix lambda handler paths and add route53 permission ([b07fe7d](https://github.com/reaandrew/snakes-and-ladders/commit/b07fe7d516ed86575f168204b2b0103301b11618))
* **infra:** mark acm_certificate_arn output as sensitive ([f35de5f](https://github.com/reaandrew/snakes-and-ladders/commit/f35de5fb37c82d3c86339b2be5a68a658fe5c9b4))
* **infra:** move ACM cert to aws_setup, use techar.ch domain ([6acf072](https://github.com/reaandrew/snakes-and-ladders/commit/6acf072e79526de424ed429737af9c80c6efaa02))
* semantic release and WebSocket endpoint issues ([2cda96b](https://github.com/reaandrew/snakes-and-ladders/commit/2cda96b401e44ab36cd310a30dcf717bb2234a6d))
