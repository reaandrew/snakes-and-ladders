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
