## [2.7.7](https://github.com/reaandrew/snakes-and-ladders/compare/v2.7.6...v2.7.7) (2026-02-11)

### Performance Improvements

* batch player moves and throttle canvas redraws for 150-player games ([f988dea](https://github.com/reaandrew/snakes-and-ladders/commit/f988dea4436592e7d540a88a7fb37e141f375f5b))

## [2.7.6](https://github.com/reaandrew/snakes-and-ladders/compare/v2.7.5...v2.7.6) (2026-02-11)

### Bug Fixes

* mobile bottom bar showed every player's last move, not just yours ([1610905](https://github.com/reaandrew/snakes-and-ladders/commit/16109057abd5230b9c6b447e3fbfbb9e8b5d261a))

## [2.7.5](https://github.com/reaandrew/snakes-and-ladders/compare/v2.7.4...v2.7.5) (2026-02-11)

### Performance Improvements

* only log current player's moves to reduce re-renders ([517dac9](https://github.com/reaandrew/snakes-and-ladders/commit/517dac9575d16f045a8e7745a7a1507c78c254a7))

## [2.7.4](https://github.com/reaandrew/snakes-and-ladders/compare/v2.7.3...v2.7.4) (2026-02-11)

### Bug Fixes

* only animate dice for local player's rolls, bump instance to t3.2xlarge ([15c252b](https://github.com/reaandrew/snakes-and-ladders/commit/15c252ba790b198161ae68993e54dfa89d9eebdd))

## [2.7.3](https://github.com/reaandrew/snakes-and-ladders/compare/v2.7.2...v2.7.3) (2026-02-10)

### Bug Fixes

* poll ErrorResponse missing type field, causing silent identity failures ([8487d26](https://github.com/reaandrew/snakes-and-ladders/commit/8487d262bf07557310fa7e53f32261cd523f599d))

## [2.7.2](https://github.com/reaandrew/snakes-and-ladders/compare/v2.7.1...v2.7.2) (2026-02-10)

### Bug Fixes

* long-polling send response was silently discarded, causing identity swap ([8b5a86f](https://github.com/reaandrew/snakes-and-ladders/commit/8b5a86fc80e45412f10500099f3e294bb60e04ee))

## [2.7.1](https://github.com/reaandrew/snakes-and-ladders/compare/v2.7.0...v2.7.1) (2026-02-10)

### Bug Fixes

* reconnection after phone sleep and player disconnect handling ([bceb283](https://github.com/reaandrew/snakes-and-ladders/commit/bceb28360f51af3473a1252481cf46c2b1e2e779))

## [2.7.0](https://github.com/reaandrew/snakes-and-ladders/compare/v2.6.0...v2.7.0) (2026-02-10)

### Features

* add batch parallel player joining to load test ([20e1f1e](https://github.com/reaandrew/snakes-and-ladders/commit/20e1f1e7a60bd52cb40d4f2bef7d9d630b890748))
* add final summary to load test and separate CI load test jobs ([b19f4c1](https://github.com/reaandrew/snakes-and-ladders/commit/b19f4c1604b0f07d402d53cc7201dd5b35dbd036))
* add poll endpoints, fix hub race condition, add CloudWatch logging ([96254ac](https://github.com/reaandrew/snakes-and-ladders/commit/96254ac42f53a310f687eee68a976c1703f54f1c))
* increase max players to 300 and bump CI load tests ([a3c281e](https://github.com/reaandrew/snakes-and-ladders/commit/a3c281e28aae147cbf0de70c40440fc8aed73c7b))

### Bug Fixes

* increase instance refresh wait from 5min to 10min ([37dcb9d](https://github.com/reaandrew/snakes-and-ladders/commit/37dcb9d9a531ccaa23abb71dab48046b9ce00b4e))
* reduce instance refresh wait times for faster deploys ([d193056](https://github.com/reaandrew/snakes-and-ladders/commit/d1930560f093ee37f0ce4a627e000c6d9ad719da))

## [2.6.0](https://github.com/reaandrew/snakes-and-ladders/compare/v2.5.0...v2.6.0) (2026-02-10)

### Features

* add long polling players to load test ([1cff8fb](https://github.com/reaandrew/snakes-and-ladders/commit/1cff8fbb951cdedcb2f893c672ee9b6e93badb08))

## [2.5.0](https://github.com/reaandrew/snakes-and-ladders/compare/v2.4.0...v2.5.0) (2026-02-09)

### Features

* increase CI load test to 100 players with 2min timeout ([515e030](https://github.com/reaandrew/snakes-and-ladders/commit/515e030cdcd149081dadfeefff548a766bc5f16b))
* load test plays full game and reports winner ([f0f4f25](https://github.com/reaandrew/snakes-and-ladders/commit/f0f4f25b71b0227f0139d5c1fcb37836f60ca8c2))

## [2.4.0](https://github.com/reaandrew/snakes-and-ladders/compare/v2.3.0...v2.4.0) (2026-02-09)

### Features

* add load test script for simulating 100+ bot players ([e20695e](https://github.com/reaandrew/snakes-and-ladders/commit/e20695ea3d20af25f9effe223e31c24644bc9328))
* add session persistence and rejoin support ([a166795](https://github.com/reaandrew/snakes-and-ladders/commit/a16679571a4487a2886c73058a61bc28158e880b))

### Bug Fixes

* cancel in-progress instance refresh before starting new one ([830421c](https://github.com/reaandrew/snakes-and-ladders/commit/830421c8910049aee9a1375b8ffdb9003d766c8e))
* correct pre-existing test failures and update infrastructure config ([856ab2b](https://github.com/reaandrew/snakes-and-ladders/commit/856ab2b113ce5cfeb386522f0d439906a07416b5))
* correct WebSocket origin check in load test and update default origin ([1572338](https://github.com/reaandrew/snakes-and-ladders/commit/157233850b826d4bc72c495e2a56765c9e23fca0))
* resolve flaky TestSimultaneousRolling race condition ([8840d6f](https://github.com/reaandrew/snakes-and-ladders/commit/8840d6f20573a02d91a4381458a8e69c258d5c0f))
* resolve security hotspots and add test coverage ([ac1e85f](https://github.com/reaandrew/snakes-and-ladders/commit/ac1e85f559a6bef7b2d002818b880ef132cce5b5))
* wait for ASG instance refresh before running load test ([3a1888c](https://github.com/reaandrew/snakes-and-ladders/commit/3a1888c488015c46da0f79bd8d3abca95b245c80))

## [2.3.0](https://github.com/reaandrew/snakes-and-ladders/compare/v2.2.0...v2.3.0) (2026-02-05)

### Features

* add SLSA provenance attestations to CI/CD pipeline ([07f0626](https://github.com/reaandrew/snakes-and-ladders/commit/07f062690babf6fa8d09e46c1fd75e507a54878e))

## [2.2.0](https://github.com/reaandrew/snakes-and-ladders/compare/v2.1.1...v2.2.0) (2026-02-04)

### Features

* support 200 players with scalable waiting room UI ([d623320](https://github.com/reaandrew/snakes-and-ladders/commit/d62332069790bf9943cf74e6a92e71e02f9f068b))

## [2.1.1](https://github.com/reaandrew/snakes-and-ladders/compare/v2.1.0...v2.1.1) (2026-02-04)

### Bug Fixes

* **frontend:** align leader line with progress bars in admin race view ([d896153](https://github.com/reaandrew/snakes-and-ladders/commit/d896153fd149feb95f18ee39c50ae13d66f56415))

## [2.1.0](https://github.com/reaandrew/snakes-and-ladders/compare/v2.0.0...v2.1.0) (2026-02-04)

### Features

* **go-backend:** add admin API endpoints ([c409edf](https://github.com/reaandrew/snakes-and-ladders/commit/c409edfd983371ae57b526b09b589dc33a6c43b7))

## [2.0.0](https://github.com/reaandrew/snakes-and-ladders/compare/v1.6.0...v2.0.0) (2026-02-04)

### ⚠ BREAKING CHANGES

* **backend:** Game is now a race where all players can roll
simultaneously, not a turn-based game where players wait their turn.

Changes:
- Remove turn-based logic from game.go (no more ErrNotYourTurn)
- Remove NextPlayerID from PlayerMovedMessage
- Update tests to verify race mechanics
- Add comprehensive E2E tests with Playwright

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>

### Features

* **backend:** add admin API Lambda handlers for production ([d80378b](https://github.com/reaandrew/snakes-and-ladders/commit/d80378b3f84f5de299231feedd7a4d02d7f38250))

### Bug Fixes

* **backend:** convert from turn-based to RACE game mechanics ([ca37fb4](https://github.com/reaandrew/snakes-and-ladders/commit/ca37fb4cc9203901b1d5bc3f228ade4480f1e23e))
* **ci:** add dependency-audit to build job dependencies for faster failure ([b816d6b](https://github.com/reaandrew/snakes-and-ladders/commit/b816d6b2afcaa8c311d2ac67f82cf37f19cbf00f))
* **ci:** fix lint, format, and audit failures ([04ead26](https://github.com/reaandrew/snakes-and-ladders/commit/04ead2618a191a7f11f5302a0fbb34d9a665bca3))
* **ci:** upgrade to Node.js 22 for semantic-release 25.x ([cbb1364](https://github.com/reaandrew/snakes-and-ladders/commit/cbb136424d6a987327c42687bfed7a9271fcb405))
* **ci:** use SonarCloud action instead of SonarQube action ([51ed0a2](https://github.com/reaandrew/snakes-and-ladders/commit/51ed0a2e8fac1dcc72bd5b389bb903d90da880f0))

## [1.6.0](https://github.com/reaandrew/snakes-and-ladders/compare/v1.5.3...v1.6.0) (2026-02-03)

### Features

* **frontend:** persist game session in localStorage for page refresh ([1d4eea2](https://github.com/reaandrew/snakes-and-ladders/commit/1d4eea2d66dc0c26776923cb1828c0ba10817167))

## [1.5.3](https://github.com/reaandrew/snakes-and-ladders/compare/v1.5.2...v1.5.3) (2026-02-03)

### Bug Fixes

* **backend:** upgrade to t3.medium and add player name validation ([4610e18](https://github.com/reaandrew/snakes-and-ladders/commit/4610e18cac19478c7e5bb591ed85800a4d92910f))

## [1.5.2](https://github.com/reaandrew/snakes-and-ladders/compare/v1.5.1...v1.5.2) (2026-02-03)

### Bug Fixes

* **backend:** return joinedGame message for rejoinGame handler ([63675b9](https://github.com/reaandrew/snakes-and-ladders/commit/63675b9bbaac904296d4fc047e9d848920d85d30))

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
