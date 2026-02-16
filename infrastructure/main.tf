terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.32"
    }
  }

  backend "s3" {
    bucket  = "snakes-and-ladders-terraform-state-ee"
    key     = "prod/terraform.tfstate"
    region  = "eu-west-2"
    encrypt = true
  }
}

provider "aws" {
  region = var.aws_region
}

# us-east-1 provider - needed to destroy orphaned ACM resources from state
# Can be removed after next successful deploy
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

locals {
  project = "snakes-and-ladders"
  env     = "prod-ee"
  tags = {
    Project     = local.project
    Environment = local.env
    ManagedBy   = "terraform"
  }
}

# =============================================================================
# Route53 Hosted Zone Data Source
# =============================================================================

data "aws_route53_zone" "main" {
  name         = var.route53_zone_name
  private_zone = false
}

# =============================================================================
# ACM Certificate (from SSM - created in aws_setup)
# =============================================================================

data "aws_ssm_parameter" "frontend_cert_arn" {
  name = "/snakes-and-ladders/certificates/frontend_cert_arn"
}

locals {
  frontend_cert_arn = data.aws_ssm_parameter.frontend_cert_arn.value
}

# =============================================================================
# KMS Keys
# =============================================================================

resource "aws_kms_key" "dynamodb" {
  description             = "KMS key for DynamoDB encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow DynamoDB Service"
        Effect = "Allow"
        Principal = {
          Service = "dynamodb.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = local.tags
}

resource "aws_kms_alias" "dynamodb" {
  name          = "alias/${local.project}-${local.env}-dynamodb"
  target_key_id = aws_kms_key.dynamodb.key_id
}

resource "aws_kms_key" "s3" {
  description             = "KMS key for S3 encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow S3 Service"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      },
      {
        Sid    = "Allow CloudFront Service"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey*"
        ]
        Resource = "*"
      }
    ]
  })

  tags = local.tags
}

resource "aws_kms_alias" "s3" {
  name          = "alias/${local.project}-${local.env}-s3"
  target_key_id = aws_kms_key.s3.key_id
}

resource "aws_kms_key" "cloudwatch" {
  description             = "KMS key for CloudWatch Logs encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow CloudWatch Logs"
        Effect = "Allow"
        Principal = {
          Service = "logs.${data.aws_region.current.name}.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
        Condition = {
          ArnLike = {
            "kms:EncryptionContext:aws:logs:arn" = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${local.project}-*"
          }
        }
      },
      {
        Sid    = "Allow API Gateway Logs"
        Effect = "Allow"
        Principal = {
          Service = "logs.${data.aws_region.current.name}.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
        Condition = {
          ArnLike = {
            "kms:EncryptionContext:aws:logs:arn" = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/apigateway/${local.project}-*"
          }
        }
      }
    ]
  })

  tags = local.tags
}

resource "aws_kms_alias" "cloudwatch" {
  name          = "alias/${local.project}-${local.env}-cloudwatch"
  target_key_id = aws_kms_key.cloudwatch.key_id
}

resource "aws_kms_key" "lambda_env" {
  description             = "KMS key for Lambda environment variable encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow Lambda Service"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = local.tags
}

resource "aws_kms_alias" "lambda_env" {
  name          = "alias/${local.project}-${local.env}-lambda-env"
  target_key_id = aws_kms_key.lambda_env.key_id
}

# =============================================================================
# DynamoDB Table
# =============================================================================

resource "aws_dynamodb_table" "main" {
  name         = "${local.project}-${local.env}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  global_secondary_index {
    name            = "GSI1"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "TTL"
    enabled        = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.dynamodb.arn
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = local.tags
}

# =============================================================================
# Lambda Deployment Packages
# =============================================================================

data "archive_file" "ws_connect" {
  type        = "zip"
  source_file = "${path.module}/../packages/backend/dist/ws-connect.js"
  output_path = "${path.module}/lambda-zips/ws-connect.zip"
}

data "archive_file" "ws_disconnect" {
  type        = "zip"
  source_file = "${path.module}/../packages/backend/dist/ws-disconnect.js"
  output_path = "${path.module}/lambda-zips/ws-disconnect.zip"
}

data "archive_file" "ws_default" {
  type        = "zip"
  source_file = "${path.module}/../packages/backend/dist/ws-default.js"
  output_path = "${path.module}/lambda-zips/ws-default.zip"
}

data "archive_file" "http_create_game" {
  type        = "zip"
  source_file = "${path.module}/../packages/backend/dist/http-create-game.js"
  output_path = "${path.module}/lambda-zips/http-create-game.zip"
}

data "archive_file" "http_get_game" {
  type        = "zip"
  source_file = "${path.module}/../packages/backend/dist/http-get-game.js"
  output_path = "${path.module}/lambda-zips/http-get-game.zip"
}

data "archive_file" "http_poll" {
  type        = "zip"
  source_file = "${path.module}/../packages/backend/dist/http-poll.js"
  output_path = "${path.module}/lambda-zips/http-poll.zip"
}

# =============================================================================
# Lambda IAM Roles and Functions
# =============================================================================

# --- ws-connect Lambda ---
resource "aws_iam_role" "ws_connect" {
  name = "${local.project}-${local.env}-ws-connect-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "ws_connect_basic" {
  role       = aws_iam_role.ws_connect.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "ws_connect_xray" {
  role       = aws_iam_role.ws_connect.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

resource "aws_iam_role_policy" "ws_connect_dynamodb" {
  name = "dynamodb-access"
  role = aws_iam_role.ws_connect.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.main.arn,
          "${aws_dynamodb_table.main.arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:GenerateDataKey"
        ]
        Resource = [aws_kms_key.dynamodb.arn]
      }
    ]
  })
}

resource "aws_lambda_function" "ws_connect" {
  #checkov:skip=CKV_AWS_117:Lambda does not need VPC access - only accesses DynamoDB via AWS APIs
  #checkov:skip=CKV_AWS_116:Real-time game - DLQ retry would deliver stale game state
  #checkov:skip=CKV_AWS_272:Code signing not required - code deployed via CI/CD with integrity checks
  function_name                  = "${local.project}-${local.env}-ws-connect"
  role                           = aws_iam_role.ws_connect.arn
  handler                        = "ws-connect.handler"
  runtime                        = "nodejs20.x"
  timeout                        = 30
  memory_size                    = 256
  reserved_concurrent_executions = 100
  kms_key_arn                    = aws_kms_key.lambda_env.arn

  filename         = data.archive_file.ws_connect.output_path
  source_code_hash = data.archive_file.ws_connect.output_base64sha256

  tracing_config {
    mode = "Active"
  }

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.main.name
    }
  }

  tags = local.tags
}

resource "aws_cloudwatch_log_group" "ws_connect" {
  #checkov:skip=CKV_AWS_338:14-day retention is sufficient for game logs - cost optimization
  name              = "/aws/lambda/${local.project}-${local.env}-ws-connect"
  retention_in_days = 14
  kms_key_id        = aws_kms_key.cloudwatch.arn
  tags              = local.tags
}

# --- ws-disconnect Lambda ---
resource "aws_iam_role" "ws_disconnect" {
  name = "${local.project}-${local.env}-ws-disconnect-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "ws_disconnect_basic" {
  role       = aws_iam_role.ws_disconnect.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "ws_disconnect_xray" {
  role       = aws_iam_role.ws_disconnect.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

resource "aws_iam_role_policy" "ws_disconnect_dynamodb" {
  name = "dynamodb-access"
  role = aws_iam_role.ws_disconnect.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.main.arn,
          "${aws_dynamodb_table.main.arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:GenerateDataKey"
        ]
        Resource = [aws_kms_key.dynamodb.arn]
      }
    ]
  })
}

resource "aws_lambda_function" "ws_disconnect" {
  #checkov:skip=CKV_AWS_117:Lambda does not need VPC access - only accesses DynamoDB via AWS APIs
  #checkov:skip=CKV_AWS_116:Real-time game - DLQ retry would deliver stale game state
  #checkov:skip=CKV_AWS_272:Code signing not required - code deployed via CI/CD with integrity checks
  function_name                  = "${local.project}-${local.env}-ws-disconnect"
  role                           = aws_iam_role.ws_disconnect.arn
  handler                        = "ws-disconnect.handler"
  runtime                        = "nodejs20.x"
  timeout                        = 30
  memory_size                    = 256
  reserved_concurrent_executions = 100
  kms_key_arn                    = aws_kms_key.lambda_env.arn

  filename         = data.archive_file.ws_disconnect.output_path
  source_code_hash = data.archive_file.ws_disconnect.output_base64sha256

  tracing_config {
    mode = "Active"
  }

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.main.name
    }
  }

  tags = local.tags
}

resource "aws_cloudwatch_log_group" "ws_disconnect" {
  #checkov:skip=CKV_AWS_338:14-day retention is sufficient for game logs - cost optimization
  name              = "/aws/lambda/${local.project}-${local.env}-ws-disconnect"
  retention_in_days = 14
  kms_key_id        = aws_kms_key.cloudwatch.arn
  tags              = local.tags
}

# --- ws-default Lambda ---
resource "aws_iam_role" "ws_default" {
  name = "${local.project}-${local.env}-ws-default-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "ws_default_basic" {
  role       = aws_iam_role.ws_default.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "ws_default_xray" {
  role       = aws_iam_role.ws_default.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

resource "aws_iam_role_policy" "ws_default_dynamodb" {
  name = "dynamodb-access"
  role = aws_iam_role.ws_default.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.main.arn,
          "${aws_dynamodb_table.main.arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:GenerateDataKey"
        ]
        Resource = [aws_kms_key.dynamodb.arn]
      }
    ]
  })
}

resource "aws_iam_role_policy" "ws_default_api_gateway" {
  name = "api-gateway-management"
  role = aws_iam_role.ws_default.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "execute-api:ManageConnections"
        ]
        Resource = "arn:aws:execute-api:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*/*/*/*"
      }
    ]
  })
}

resource "aws_lambda_function" "ws_default" {
  #checkov:skip=CKV_AWS_117:Lambda does not need VPC access - only accesses DynamoDB via AWS APIs
  #checkov:skip=CKV_AWS_116:Real-time game - DLQ retry would deliver stale game state
  #checkov:skip=CKV_AWS_272:Code signing not required - code deployed via CI/CD with integrity checks
  function_name                  = "${local.project}-${local.env}-ws-default"
  role                           = aws_iam_role.ws_default.arn
  handler                        = "ws-default.handler"
  runtime                        = "nodejs20.x"
  timeout                        = 30
  memory_size                    = 256
  reserved_concurrent_executions = 100
  kms_key_arn                    = aws_kms_key.lambda_env.arn

  filename         = data.archive_file.ws_default.output_path
  source_code_hash = data.archive_file.ws_default.output_base64sha256

  tracing_config {
    mode = "Active"
  }

  environment {
    variables = {
      TABLE_NAME         = aws_dynamodb_table.main.name
      WEBSOCKET_ENDPOINT = "${replace(aws_apigatewayv2_api.websocket.api_endpoint, "wss://", "https://")}/prod"
    }
  }

  tags = local.tags
}

resource "aws_cloudwatch_log_group" "ws_default" {
  #checkov:skip=CKV_AWS_338:14-day retention is sufficient for game logs - cost optimization
  name              = "/aws/lambda/${local.project}-${local.env}-ws-default"
  retention_in_days = 14
  kms_key_id        = aws_kms_key.cloudwatch.arn
  tags              = local.tags
}

# --- http-create-game Lambda ---
resource "aws_iam_role" "http_create_game" {
  name = "${local.project}-${local.env}-http-create-game-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "http_create_game_basic" {
  role       = aws_iam_role.http_create_game.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "http_create_game_xray" {
  role       = aws_iam_role.http_create_game.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

resource "aws_iam_role_policy" "http_create_game_dynamodb" {
  name = "dynamodb-access"
  role = aws_iam_role.http_create_game.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.main.arn,
          "${aws_dynamodb_table.main.arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:GenerateDataKey"
        ]
        Resource = [aws_kms_key.dynamodb.arn]
      }
    ]
  })
}

resource "aws_lambda_function" "http_create_game" {
  #checkov:skip=CKV_AWS_117:Lambda does not need VPC access - only accesses DynamoDB via AWS APIs
  #checkov:skip=CKV_AWS_116:Real-time game - DLQ retry would deliver stale game state
  #checkov:skip=CKV_AWS_272:Code signing not required - code deployed via CI/CD with integrity checks
  function_name                  = "${local.project}-${local.env}-http-create-game"
  role                           = aws_iam_role.http_create_game.arn
  handler                        = "http-create-game.handler"
  runtime                        = "nodejs20.x"
  timeout                        = 30
  memory_size                    = 256
  reserved_concurrent_executions = 100
  kms_key_arn                    = aws_kms_key.lambda_env.arn

  filename         = data.archive_file.http_create_game.output_path
  source_code_hash = data.archive_file.http_create_game.output_base64sha256

  tracing_config {
    mode = "Active"
  }

  environment {
    variables = {
      TABLE_NAME     = aws_dynamodb_table.main.name
      ALLOWED_ORIGIN = "https://${var.domain_name}"
    }
  }

  tags = local.tags
}

resource "aws_cloudwatch_log_group" "http_create_game" {
  #checkov:skip=CKV_AWS_338:14-day retention is sufficient for game logs - cost optimization
  name              = "/aws/lambda/${local.project}-${local.env}-http-create-game"
  retention_in_days = 14
  kms_key_id        = aws_kms_key.cloudwatch.arn
  tags              = local.tags
}

# --- http-get-game Lambda ---
resource "aws_iam_role" "http_get_game" {
  name = "${local.project}-${local.env}-http-get-game-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "http_get_game_basic" {
  role       = aws_iam_role.http_get_game.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "http_get_game_xray" {
  role       = aws_iam_role.http_get_game.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

resource "aws_iam_role_policy" "http_get_game_dynamodb" {
  name = "dynamodb-access"
  role = aws_iam_role.http_get_game.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.main.arn,
          "${aws_dynamodb_table.main.arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:GenerateDataKey"
        ]
        Resource = [aws_kms_key.dynamodb.arn]
      }
    ]
  })
}

resource "aws_lambda_function" "http_get_game" {
  #checkov:skip=CKV_AWS_117:Lambda does not need VPC access - only accesses DynamoDB via AWS APIs
  #checkov:skip=CKV_AWS_116:Real-time game - DLQ retry would deliver stale game state
  #checkov:skip=CKV_AWS_272:Code signing not required - code deployed via CI/CD with integrity checks
  function_name                  = "${local.project}-${local.env}-http-get-game"
  role                           = aws_iam_role.http_get_game.arn
  handler                        = "http-get-game.handler"
  runtime                        = "nodejs20.x"
  timeout                        = 30
  memory_size                    = 256
  reserved_concurrent_executions = 100
  kms_key_arn                    = aws_kms_key.lambda_env.arn

  filename         = data.archive_file.http_get_game.output_path
  source_code_hash = data.archive_file.http_get_game.output_base64sha256

  tracing_config {
    mode = "Active"
  }

  environment {
    variables = {
      TABLE_NAME     = aws_dynamodb_table.main.name
      ALLOWED_ORIGIN = "https://${var.domain_name}"
    }
  }

  tags = local.tags
}

resource "aws_cloudwatch_log_group" "http_get_game" {
  #checkov:skip=CKV_AWS_338:14-day retention is sufficient for game logs - cost optimization
  name              = "/aws/lambda/${local.project}-${local.env}-http-get-game"
  retention_in_days = 14
  kms_key_id        = aws_kms_key.cloudwatch.arn
  tags              = local.tags
}

# --- http-poll Lambda (Long-polling fallback) ---
resource "aws_iam_role" "http_poll" {
  name = "${local.project}-${local.env}-http-poll-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "http_poll_basic" {
  role       = aws_iam_role.http_poll.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "http_poll_xray" {
  role       = aws_iam_role.http_poll.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

resource "aws_iam_role_policy" "http_poll_dynamodb" {
  name = "dynamodb-access"
  role = aws_iam_role.http_poll.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.main.arn,
          "${aws_dynamodb_table.main.arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:GenerateDataKey"
        ]
        Resource = [aws_kms_key.dynamodb.arn]
      }
    ]
  })
}

resource "aws_lambda_function" "http_poll" {
  #checkov:skip=CKV_AWS_117:Lambda does not need VPC access - only accesses DynamoDB via AWS APIs
  #checkov:skip=CKV_AWS_116:Real-time game - DLQ retry would deliver stale game state
  #checkov:skip=CKV_AWS_272:Code signing not required - code deployed via CI/CD with integrity checks
  function_name                  = "${local.project}-${local.env}-http-poll"
  role                           = aws_iam_role.http_poll.arn
  handler                        = "http-poll.handler"
  runtime                        = "nodejs20.x"
  timeout                        = 30
  memory_size                    = 256
  reserved_concurrent_executions = 100
  kms_key_arn                    = aws_kms_key.lambda_env.arn

  filename         = data.archive_file.http_poll.output_path
  source_code_hash = data.archive_file.http_poll.output_base64sha256

  tracing_config {
    mode = "Active"
  }

  environment {
    variables = {
      TABLE_NAME     = aws_dynamodb_table.main.name
      ALLOWED_ORIGIN = "https://${var.domain_name}"
    }
  }

  tags = local.tags
}

resource "aws_cloudwatch_log_group" "http_poll" {
  #checkov:skip=CKV_AWS_338:14-day retention is sufficient for game logs - cost optimization
  name              = "/aws/lambda/${local.project}-${local.env}-http-poll"
  retention_in_days = 14
  kms_key_id        = aws_kms_key.cloudwatch.arn
  tags              = local.tags
}

# =============================================================================
# API Gateway - WebSocket
# =============================================================================

resource "aws_apigatewayv2_api" "websocket" {
  name                       = "${local.project}-${local.env}-websocket"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.action"

  tags = local.tags
}

resource "aws_cloudwatch_log_group" "websocket_api" {
  #checkov:skip=CKV_AWS_338:14-day retention is sufficient for game logs - cost optimization
  name              = "/aws/apigateway/${local.project}-${local.env}-websocket"
  retention_in_days = 14
  kms_key_id        = aws_kms_key.cloudwatch.arn
  tags              = local.tags
}

resource "aws_apigatewayv2_stage" "websocket" {
  #checkov:skip=CKV2_AWS_51:Public game API - client certificates not applicable for browser WebSocket
  api_id      = aws_apigatewayv2_api.websocket.id
  name        = "prod"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.websocket_api.arn
    format = jsonencode({
      requestId    = "$context.requestId"
      ip           = "$context.identity.sourceIp"
      requestTime  = "$context.requestTime"
      routeKey     = "$context.routeKey"
      status       = "$context.status"
      connectionId = "$context.connectionId"
      errorMessage = "$context.error.message"
    })
  }

  default_route_settings {
    throttling_burst_limit = 100
    throttling_rate_limit  = 50
  }

  tags = local.tags
}

# WebSocket Routes
resource "aws_apigatewayv2_route" "ws_connect" {
  #checkov:skip=CKV_AWS_309:Public game API - no authorization required for WebSocket connections
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$connect"
  target    = "integrations/${aws_apigatewayv2_integration.ws_connect.id}"
}

resource "aws_apigatewayv2_route" "ws_disconnect" {
  #checkov:skip=CKV_AWS_309:Public game API - no authorization required for WebSocket connections
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$disconnect"
  target    = "integrations/${aws_apigatewayv2_integration.ws_disconnect.id}"
}

resource "aws_apigatewayv2_route" "ws_default" {
  #checkov:skip=CKV_AWS_309:Public game API - no authorization required for WebSocket connections
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.ws_default.id}"
}

# WebSocket Integrations
resource "aws_apigatewayv2_integration" "ws_connect" {
  api_id             = aws_apigatewayv2_api.websocket.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.ws_connect.invoke_arn
  integration_method = "POST"
}

resource "aws_apigatewayv2_integration" "ws_disconnect" {
  api_id             = aws_apigatewayv2_api.websocket.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.ws_disconnect.invoke_arn
  integration_method = "POST"
}

resource "aws_apigatewayv2_integration" "ws_default" {
  api_id             = aws_apigatewayv2_api.websocket.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.ws_default.invoke_arn
  integration_method = "POST"
}

# Lambda Permissions for WebSocket
resource "aws_lambda_permission" "ws_connect" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ws_connect.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*/*"
}

resource "aws_lambda_permission" "ws_disconnect" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ws_disconnect.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*/*"
}

resource "aws_lambda_permission" "ws_default" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ws_default.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*/*"
}

# =============================================================================
# API Gateway - HTTP
# =============================================================================

resource "aws_apigatewayv2_api" "http" {
  name          = "${local.project}-${local.env}-http"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["https://${var.domain_name}"]
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization", "X-Connection-Id"]
    max_age       = 300
  }

  tags = local.tags
}

resource "aws_cloudwatch_log_group" "http_api" {
  #checkov:skip=CKV_AWS_338:14-day retention is sufficient for game logs - cost optimization
  name              = "/aws/apigateway/${local.project}-${local.env}-http"
  retention_in_days = 14
  kms_key_id        = aws_kms_key.cloudwatch.arn
  tags              = local.tags
}

resource "aws_apigatewayv2_stage" "http" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "prod"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.http_api.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      responseLength = "$context.responseLength"
      errorMessage   = "$context.error.message"
    })
  }

  tags = local.tags
}

# HTTP Routes
resource "aws_apigatewayv2_route" "create_game" {
  #checkov:skip=CKV_AWS_309:Public game API - no authorization required for game creation
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /games"
  target    = "integrations/${aws_apigatewayv2_integration.create_game.id}"
}

resource "aws_apigatewayv2_route" "get_game" {
  #checkov:skip=CKV_AWS_309:Public game API - no authorization required for game lookup
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "GET /games/{code}"
  target    = "integrations/${aws_apigatewayv2_integration.get_game.id}"
}

# HTTP Integrations
resource "aws_apigatewayv2_integration" "create_game" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.http_create_game.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "get_game" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.http_get_game.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# Lambda Permissions for HTTP
resource "aws_lambda_permission" "http_create_game" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.http_create_game.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "http_get_game" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.http_get_game.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

# Long-polling Routes (fallback for WebSocket)
resource "aws_apigatewayv2_route" "poll_connect" {
  #checkov:skip=CKV_AWS_309:Public game API - long-polling fallback for browsers without WebSocket
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /poll/connect"
  target    = "integrations/${aws_apigatewayv2_integration.http_poll.id}"
}

resource "aws_apigatewayv2_route" "poll_messages" {
  #checkov:skip=CKV_AWS_309:Public game API - long-polling fallback for browsers without WebSocket
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "GET /poll/messages"
  target    = "integrations/${aws_apigatewayv2_integration.http_poll.id}"
}

resource "aws_apigatewayv2_route" "poll_send" {
  #checkov:skip=CKV_AWS_309:Public game API - long-polling fallback for browsers without WebSocket
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /poll/send"
  target    = "integrations/${aws_apigatewayv2_integration.http_poll.id}"
}

resource "aws_apigatewayv2_route" "poll_disconnect" {
  #checkov:skip=CKV_AWS_309:Public game API - long-polling fallback for browsers without WebSocket
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /poll/disconnect"
  target    = "integrations/${aws_apigatewayv2_integration.http_poll.id}"
}

resource "aws_apigatewayv2_integration" "http_poll" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.http_poll.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_lambda_permission" "http_poll" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.http_poll.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

# =============================================================================
# S3 + CloudFront
# =============================================================================

# Logging bucket for S3 and CloudFront
resource "aws_s3_bucket" "logs" {
  #checkov:skip=CKV2_AWS_62:Event notifications not needed for logs bucket
  #checkov:skip=CKV_AWS_144:Cross-region replication adds cost - not needed for game logs
  bucket = "${local.project}-${local.env}-logs"
  tags   = local.tags
}

resource "aws_s3_bucket_public_access_block" "logs" {
  bucket = aws_s3_bucket.logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.s3.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_versioning" "logs" {
  bucket = aws_s3_bucket.logs.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    id     = "expire-logs"
    status = "Enabled"

    filter {
      prefix = ""
    }

    expiration {
      days = 90
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# Grant CloudFront logging permissions
resource "aws_s3_bucket_ownership_controls" "logs" {
  #checkov:skip=CKV2_AWS_65:CloudFront standard logging requires ACLs - cannot use BucketOwnerEnforced
  bucket = aws_s3_bucket.logs.id

  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_acl" "logs" {
  depends_on = [aws_s3_bucket_ownership_controls.logs]
  bucket     = aws_s3_bucket.logs.id
  acl        = "log-delivery-write"
}

resource "aws_s3_bucket" "frontend" {
  #checkov:skip=CKV2_AWS_62:Event notifications not needed for static frontend assets
  #checkov:skip=CKV_AWS_144:Cross-region replication adds cost - not needed for game assets
  bucket = "${local.project}-${local.env}-frontend"

  tags = local.tags
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.s3.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_logging" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  target_bucket = aws_s3_bucket.logs.id
  target_prefix = "s3-access-logs/"
}

resource "aws_s3_bucket_lifecycle_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    id     = "abort-incomplete-uploads"
    status = "Enabled"

    filter {
      prefix = ""
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# CloudFront Origin Access Control
resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${local.project}-${local.env}-frontend-oac"
  description                       = "OAC for ${local.project}-${local.env}-frontend"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# WAF Web ACL for CloudFront
resource "aws_wafv2_web_acl" "cloudfront" {
  provider    = aws.us_east_1
  name        = "${local.project}-${local.env}-cloudfront-waf"
  description = "WAF for CloudFront distribution"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesKnownBadInputsRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "RateLimitRule"
    priority = 3

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRuleMetric"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "CloudFrontWAFMetric"
    sampled_requests_enabled   = true
  }

  tags = local.tags
}

# WAF Logging
#tfsec:ignore:aws-cloudwatch-log-group-customer-key
resource "aws_cloudwatch_log_group" "waf" {
  #checkov:skip=CKV_AWS_338:14-day retention is sufficient for game logs - cost optimization
  #checkov:skip=CKV_AWS_158:WAF logs in us-east-1 - separate KMS key adds complexity
  provider          = aws.us_east_1
  name              = "aws-waf-logs-${local.project}-${local.env}"
  retention_in_days = 14
  tags              = local.tags
}

resource "aws_wafv2_web_acl_logging_configuration" "cloudfront" {
  provider                = aws.us_east_1
  log_destination_configs = [aws_cloudwatch_log_group.waf.arn]
  resource_arn            = aws_wafv2_web_acl.cloudfront.arn
}

# CloudFront Response Headers Policy (security headers)
resource "aws_cloudfront_response_headers_policy" "security" {
  name = "${local.project}-${local.env}-security-headers"

  security_headers_config {
    content_type_options {
      override = true
    }
    frame_options {
      frame_option = "DENY"
      override     = true
    }
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }
    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }
  }
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "frontend" {
  #checkov:skip=CKV_AWS_374:Game should be accessible globally - no geo restriction needed
  #checkov:skip=CKV_AWS_310:Single S3 origin - origin failover not needed for static assets
  #checkov:skip=CKV2_AWS_47:WAF has AWSManagedRulesKnownBadInputsRuleSet which covers Log4j
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  aliases             = [var.domain_name]
  web_acl_id          = aws_wafv2_web_acl.cloudfront.arn

  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.frontend.bucket}"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  logging_config {
    include_cookies = false
    bucket          = aws_s3_bucket.logs.bucket_domain_name
    prefix          = "cloudfront-logs/"
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.frontend.bucket}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy     = "redirect-to-https"
    min_ttl                    = 0
    default_ttl                = 3600
    max_ttl                    = 86400
    compress                   = true
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
  }

  # SPA routing - serve index.html for 404s
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = local.frontend_cert_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = local.tags
}

# S3 bucket policy for CloudFront
resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontend.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.frontend.arn
          }
        }
      }
    ]
  })
}

# =============================================================================
# Route53 DNS Record
# =============================================================================

resource "aws_route53_record" "frontend" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}
