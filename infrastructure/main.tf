terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket  = "snakes-and-ladders-terraform-state"
    key     = "prod/terraform.tfstate"
    region  = "eu-west-2"
    encrypt = true
  }
}

provider "aws" {
  region = var.aws_region
}

# us-east-1 provider for ACM certificates (required for CloudFront)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

locals {
  project = "snakes-and-ladders"
  env     = "prod"
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
# ACM Certificate (us-east-1 for CloudFront)
# =============================================================================

resource "aws_acm_certificate" "frontend" {
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  validation_method = "DNS"

  tags = merge(local.tags, {
    Name = "${local.project}-frontend-cert"
  })

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.frontend.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "frontend" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.frontend.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
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
      }
    ]
  })
}

resource "aws_lambda_function" "ws_connect" {
  function_name = "${local.project}-${local.env}-ws-connect"
  role          = aws_iam_role.ws_connect.arn
  handler       = "ws-connect.handler"
  runtime       = "nodejs20.x"
  timeout       = 30
  memory_size   = 256

  filename         = data.archive_file.ws_connect.output_path
  source_code_hash = data.archive_file.ws_connect.output_base64sha256

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.main.name
    }
  }

  tags = local.tags
}

resource "aws_cloudwatch_log_group" "ws_connect" {
  name              = "/aws/lambda/${local.project}-${local.env}-ws-connect"
  retention_in_days = 14
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
      }
    ]
  })
}

resource "aws_lambda_function" "ws_disconnect" {
  function_name = "${local.project}-${local.env}-ws-disconnect"
  role          = aws_iam_role.ws_disconnect.arn
  handler       = "ws-disconnect.handler"
  runtime       = "nodejs20.x"
  timeout       = 30
  memory_size   = 256

  filename         = data.archive_file.ws_disconnect.output_path
  source_code_hash = data.archive_file.ws_disconnect.output_base64sha256

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.main.name
    }
  }

  tags = local.tags
}

resource "aws_cloudwatch_log_group" "ws_disconnect" {
  name              = "/aws/lambda/${local.project}-${local.env}-ws-disconnect"
  retention_in_days = 14
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
  function_name = "${local.project}-${local.env}-ws-default"
  role          = aws_iam_role.ws_default.arn
  handler       = "ws-default.handler"
  runtime       = "nodejs20.x"
  timeout       = 30
  memory_size   = 256

  filename         = data.archive_file.ws_default.output_path
  source_code_hash = data.archive_file.ws_default.output_base64sha256

  environment {
    variables = {
      TABLE_NAME         = aws_dynamodb_table.main.name
      WEBSOCKET_ENDPOINT = "${aws_apigatewayv2_api.websocket.api_endpoint}/prod"
    }
  }

  tags = local.tags
}

resource "aws_cloudwatch_log_group" "ws_default" {
  name              = "/aws/lambda/${local.project}-${local.env}-ws-default"
  retention_in_days = 14
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
      }
    ]
  })
}

resource "aws_lambda_function" "http_create_game" {
  function_name = "${local.project}-${local.env}-http-create-game"
  role          = aws_iam_role.http_create_game.arn
  handler       = "http-create-game.handler"
  runtime       = "nodejs20.x"
  timeout       = 30
  memory_size   = 256

  filename         = data.archive_file.http_create_game.output_path
  source_code_hash = data.archive_file.http_create_game.output_base64sha256

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.main.name
    }
  }

  tags = local.tags
}

resource "aws_cloudwatch_log_group" "http_create_game" {
  name              = "/aws/lambda/${local.project}-${local.env}-http-create-game"
  retention_in_days = 14
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
      }
    ]
  })
}

resource "aws_lambda_function" "http_get_game" {
  function_name = "${local.project}-${local.env}-http-get-game"
  role          = aws_iam_role.http_get_game.arn
  handler       = "http-get-game.handler"
  runtime       = "nodejs20.x"
  timeout       = 30
  memory_size   = 256

  filename         = data.archive_file.http_get_game.output_path
  source_code_hash = data.archive_file.http_get_game.output_base64sha256

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.main.name
    }
  }

  tags = local.tags
}

resource "aws_cloudwatch_log_group" "http_get_game" {
  name              = "/aws/lambda/${local.project}-${local.env}-http-get-game"
  retention_in_days = 14
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

resource "aws_apigatewayv2_stage" "websocket" {
  api_id      = aws_apigatewayv2_api.websocket.id
  name        = "prod"
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = 100
    throttling_rate_limit  = 50
  }

  tags = local.tags
}

# WebSocket Routes
resource "aws_apigatewayv2_route" "ws_connect" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$connect"
  target    = "integrations/${aws_apigatewayv2_integration.ws_connect.id}"
}

resource "aws_apigatewayv2_route" "ws_disconnect" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$disconnect"
  target    = "integrations/${aws_apigatewayv2_integration.ws_disconnect.id}"
}

resource "aws_apigatewayv2_route" "ws_default" {
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
    allow_headers = ["Content-Type", "Authorization"]
    max_age       = 300
  }

  tags = local.tags
}

resource "aws_apigatewayv2_stage" "http" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "prod"
  auto_deploy = true

  tags = local.tags
}

# HTTP Routes
resource "aws_apigatewayv2_route" "create_game" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /games"
  target    = "integrations/${aws_apigatewayv2_integration.create_game.id}"
}

resource "aws_apigatewayv2_route" "get_game" {
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

# =============================================================================
# S3 + CloudFront
# =============================================================================

resource "aws_s3_bucket" "frontend" {
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

# CloudFront Origin Access Control
resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${local.project}-${local.env}-frontend-oac"
  description                       = "OAC for ${local.project}-${local.env}-frontend"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  aliases             = [var.domain_name]

  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.frontend.bucket}"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
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

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
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
    acm_certificate_arn      = aws_acm_certificate_validation.frontend.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = local.tags

  depends_on = [aws_acm_certificate_validation.frontend]
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
