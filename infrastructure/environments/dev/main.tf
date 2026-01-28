terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "snakes-and-ladders-terraform-state"
    key            = "dev/terraform.tfstate"
    region         = "eu-west-2"
    dynamodb_table = "snakes-and-ladders-terraform-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}

locals {
  project = "snakes-and-ladders"
  env     = "dev"
  tags = {
    Project     = local.project
    Environment = local.env
    ManagedBy   = "terraform"
  }
}

# DynamoDB Table
module "dynamodb" {
  source     = "../../modules/dynamodb"
  table_name = "${local.project}-${local.env}"
  tags       = local.tags
}

# Lambda deployment packages (placeholder paths)
data "archive_file" "ws_connect" {
  type        = "zip"
  source_dir  = "${path.module}/../../../packages/backend/dist/ws-connect"
  output_path = "${path.module}/lambda-zips/ws-connect.zip"
}

data "archive_file" "ws_disconnect" {
  type        = "zip"
  source_dir  = "${path.module}/../../../packages/backend/dist/ws-disconnect"
  output_path = "${path.module}/lambda-zips/ws-disconnect.zip"
}

data "archive_file" "ws_default" {
  type        = "zip"
  source_dir  = "${path.module}/../../../packages/backend/dist/ws-default"
  output_path = "${path.module}/lambda-zips/ws-default.zip"
}

data "archive_file" "http_create_game" {
  type        = "zip"
  source_dir  = "${path.module}/../../../packages/backend/dist/http-create-game"
  output_path = "${path.module}/lambda-zips/http-create-game.zip"
}

data "archive_file" "http_get_game" {
  type        = "zip"
  source_dir  = "${path.module}/../../../packages/backend/dist/http-get-game"
  output_path = "${path.module}/lambda-zips/http-get-game.zip"
}

# Lambda Functions
module "lambda_ws_connect" {
  source             = "../../modules/lambda"
  function_name      = "${local.project}-${local.env}-ws-connect"
  handler            = "index.handler"
  zip_file           = data.archive_file.ws_connect.output_path
  source_code_hash   = data.archive_file.ws_connect.output_base64sha256
  dynamodb_table_arn = module.dynamodb.table_arn
  environment_variables = {
    TABLE_NAME = module.dynamodb.table_name
  }
  tags = local.tags
}

module "lambda_ws_disconnect" {
  source             = "../../modules/lambda"
  function_name      = "${local.project}-${local.env}-ws-disconnect"
  handler            = "index.handler"
  zip_file           = data.archive_file.ws_disconnect.output_path
  source_code_hash   = data.archive_file.ws_disconnect.output_base64sha256
  dynamodb_table_arn = module.dynamodb.table_arn
  environment_variables = {
    TABLE_NAME = module.dynamodb.table_name
  }
  tags = local.tags
}

module "lambda_ws_default" {
  source               = "../../modules/lambda"
  function_name        = "${local.project}-${local.env}-ws-default"
  handler              = "index.handler"
  zip_file             = data.archive_file.ws_default.output_path
  source_code_hash     = data.archive_file.ws_default.output_base64sha256
  dynamodb_table_arn   = module.dynamodb.table_arn
  api_gateway_endpoint = module.api_gateway.websocket_management_endpoint
  environment_variables = {
    TABLE_NAME           = module.dynamodb.table_name
    WEBSOCKET_ENDPOINT   = module.api_gateway.websocket_management_endpoint
  }
  tags = local.tags
}

module "lambda_http_create_game" {
  source             = "../../modules/lambda"
  function_name      = "${local.project}-${local.env}-http-create-game"
  handler            = "index.handler"
  zip_file           = data.archive_file.http_create_game.output_path
  source_code_hash   = data.archive_file.http_create_game.output_base64sha256
  dynamodb_table_arn = module.dynamodb.table_arn
  environment_variables = {
    TABLE_NAME = module.dynamodb.table_name
  }
  tags = local.tags
}

module "lambda_http_get_game" {
  source             = "../../modules/lambda"
  function_name      = "${local.project}-${local.env}-http-get-game"
  handler            = "index.handler"
  zip_file           = data.archive_file.http_get_game.output_path
  source_code_hash   = data.archive_file.http_get_game.output_base64sha256
  dynamodb_table_arn = module.dynamodb.table_arn
  environment_variables = {
    TABLE_NAME = module.dynamodb.table_name
  }
  tags = local.tags
}

# API Gateway
module "api_gateway" {
  source = "../../modules/api-gateway"
  name   = "${local.project}-${local.env}"

  connect_lambda_invoke_arn    = module.lambda_ws_connect.invoke_arn
  connect_lambda_name          = module.lambda_ws_connect.function_name
  disconnect_lambda_invoke_arn = module.lambda_ws_disconnect.invoke_arn
  disconnect_lambda_name       = module.lambda_ws_disconnect.function_name
  default_lambda_invoke_arn    = module.lambda_ws_default.invoke_arn
  default_lambda_name          = module.lambda_ws_default.function_name

  create_game_lambda_invoke_arn = module.lambda_http_create_game.invoke_arn
  create_game_lambda_name       = module.lambda_http_create_game.function_name
  get_game_lambda_invoke_arn    = module.lambda_http_get_game.invoke_arn
  get_game_lambda_name          = module.lambda_http_get_game.function_name

  cors_origins = ["*"]
  tags         = local.tags
}

# S3 + CloudFront
module "s3_cloudfront" {
  source      = "../../modules/s3-cloudfront"
  bucket_name = "${local.project}-${local.env}-frontend"
  tags        = local.tags
}
