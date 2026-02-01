terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
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

# GitHub OIDC Provider
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]

  tags = {
    Name    = "github-oidc-provider"
    Project = "snakes-and-ladders"
  }
}

# IAM Role for GitHub Actions
resource "aws_iam_role" "github_actions" {
  name = "github-actions-snakes-and-ladders"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_org}/${var.github_repo}:*"
          }
        }
      }
    ]
  })

  tags = {
    Name    = "github-actions-role"
    Project = "snakes-and-ladders"
  }
}

# Terraform state access
resource "aws_iam_role_policy" "terraform_state" {
  name = "terraform-state-access"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "arn:aws:s3:::${var.terraform_state_bucket}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = "arn:aws:s3:::${var.terraform_state_bucket}"
      },
    ]
  })
}

# DynamoDB - only snakes-and-ladders tables
resource "aws_iam_role_policy" "dynamodb" {
  name = "dynamodb-access"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:CreateTable",
          "dynamodb:DeleteTable",
          "dynamodb:DescribeTable",
          "dynamodb:DescribeContinuousBackups",
          "dynamodb:UpdateContinuousBackups",
          "dynamodb:DescribeTimeToLive",
          "dynamodb:ListTagsOfResource",
          "dynamodb:TagResource",
          "dynamodb:UntagResource",
          "dynamodb:UpdateTable",
          "dynamodb:UpdateTimeToLive"
        ]
        Resource = "arn:aws:dynamodb:${var.aws_region}:*:table/*snakes-and-ladders*"
      }
    ]
  })
}

# S3 - only snakes-and-ladders buckets
resource "aws_iam_role_policy" "s3" {
  name = "s3-access"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:CreateBucket",
          "s3:DeleteBucket",
          "s3:GetBucketAcl",
          "s3:GetBucketCORS",
          "s3:GetBucketLocation",
          "s3:GetBucketLogging",
          "s3:GetBucketObjectLockConfiguration",
          "s3:GetBucketOwnershipControls",
          "s3:GetBucketPolicy",
          "s3:GetBucketPublicAccessBlock",
          "s3:GetBucketRequestPayment",
          "s3:GetBucketTagging",
          "s3:GetBucketVersioning",
          "s3:GetBucketWebsite",
          "s3:GetEncryptionConfiguration",
          "s3:GetLifecycleConfiguration",
          "s3:GetReplicationConfiguration",
          "s3:GetAccelerateConfiguration",
          "s3:ListBucket",
          "s3:PutBucketAcl",
          "s3:PutBucketCORS",
          "s3:PutBucketLogging",
          "s3:PutBucketObjectLockConfiguration",
          "s3:PutBucketOwnershipControls",
          "s3:PutBucketPolicy",
          "s3:PutBucketPublicAccessBlock",
          "s3:PutBucketRequestPayment",
          "s3:PutBucketTagging",
          "s3:PutBucketVersioning",
          "s3:PutBucketWebsite",
          "s3:PutEncryptionConfiguration",
          "s3:PutLifecycleConfiguration",
          "s3:DeleteBucketPolicy",
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:GetObjectAcl",
          "s3:PutObjectAcl"
        ]
        Resource = [
          "arn:aws:s3:::*snakes-and-ladders*",
          "arn:aws:s3:::*snakes-and-ladders*/*"
        ]
      }
    ]
  })
}

# Lambda - only snakes-and-ladders functions
resource "aws_iam_role_policy" "lambda" {
  name = "lambda-access"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:CreateFunction",
          "lambda:DeleteFunction",
          "lambda:GetFunction",
          "lambda:GetFunctionCodeSigningConfig",
          "lambda:GetFunctionConfiguration",
          "lambda:GetFunctionConcurrency",
          "lambda:PutFunctionConcurrency",
          "lambda:DeleteFunctionConcurrency",
          "lambda:ListVersionsByFunction",
          "lambda:PublishVersion",
          "lambda:UpdateFunctionCode",
          "lambda:UpdateFunctionConfiguration",
          "lambda:ListTags",
          "lambda:TagResource",
          "lambda:UntagResource",
          "lambda:AddPermission",
          "lambda:RemovePermission",
          "lambda:GetPolicy"
        ]
        Resource = "arn:aws:lambda:${var.aws_region}:*:function:snakes-and-ladders-*"
      }
    ]
  })
}

# CloudWatch Logs - snakes-and-ladders log groups
resource "aws_iam_role_policy" "logs" {
  #checkov:skip=CKV_AWS_290:logs:CreateLogDelivery requires wildcard - AWS API limitation
  #checkov:skip=CKV_AWS_355:logs:CreateLogDelivery requires wildcard - AWS API limitation
  name = "logs-access"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:DescribeLogGroups"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:DeleteLogGroup",
          "logs:ListTagsLogGroup",
          "logs:ListTagsForResource",
          "logs:PutRetentionPolicy",
          "logs:DeleteRetentionPolicy",
          "logs:TagLogGroup",
          "logs:TagResource",
          "logs:UntagLogGroup",
          "logs:UntagResource",
          "logs:AssociateKmsKey",
          "logs:DisassociateKmsKey",
          "logs:CreateLogDelivery",
          "logs:GetLogDelivery",
          "logs:UpdateLogDelivery",
          "logs:DeleteLogDelivery",
          "logs:ListLogDeliveries",
          "logs:PutResourcePolicy",
          "logs:DescribeResourcePolicies",
          "logs:DeleteResourcePolicy"
        ]
        Resource = [
          "arn:aws:logs:${var.aws_region}:*:log-group:/aws/lambda/snakes-and-ladders-*",
          "arn:aws:logs:${var.aws_region}:*:log-group:/aws/apigateway/snakes-and-ladders-*",
          "arn:aws:logs:us-east-1:*:log-group:aws-waf-logs-snakes-and-ladders-*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogDelivery",
          "logs:GetLogDelivery",
          "logs:UpdateLogDelivery",
          "logs:DeleteLogDelivery",
          "logs:ListLogDeliveries",
          "logs:PutResourcePolicy",
          "logs:DescribeResourcePolicies"
        ]
        Resource = "*"
      }
    ]
  })
}

# API Gateway - full access (needed for WebSocket API management)
resource "aws_iam_role_policy" "api_gateway" {
  #checkov:skip=CKV_AWS_289:CI/CD deploy role needs broad API Gateway permissions
  #checkov:skip=CKV_AWS_290:CI/CD deploy role needs broad API Gateway permissions
  #checkov:skip=CKV_AWS_355:CI/CD deploy role needs wildcard for dynamic API Gateway resources
  name = "api-gateway-access"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "apigateway:*"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "execute-api:*"
        ]
        Resource = "*"
      }
    ]
  })
}

# CloudFront - full access (needed for distribution management)
resource "aws_iam_role_policy" "cloudfront" {
  #checkov:skip=CKV_AWS_289:CI/CD deploy role needs broad CloudFront permissions
  #checkov:skip=CKV_AWS_290:CI/CD deploy role needs broad CloudFront permissions
  #checkov:skip=CKV_AWS_355:CI/CD deploy role needs wildcard for dynamic CloudFront resources
  name = "cloudfront-access"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudfront:*"
        ]
        Resource = "*"
      }
    ]
  })
}

# Route53 - for DNS records
resource "aws_iam_role_policy" "route53" {
  #checkov:skip=CKV_AWS_290:CI/CD deploy role needs Route53 write access for DNS
  #checkov:skip=CKV_AWS_355:CI/CD deploy role needs wildcard for hosted zones
  name = "route53-access"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "route53:GetHostedZone",
          "route53:ListHostedZones",
          "route53:ListResourceRecordSets",
          "route53:ChangeResourceRecordSets",
          "route53:GetChange",
          "route53:ListTagsForResource"
        ]
        Resource = "*"
      }
    ]
  })
}

# ACM - for certificate management (us-east-1 for CloudFront)
resource "aws_iam_role_policy" "acm" {
  #checkov:skip=CKV_AWS_290:CI/CD deploy role needs ACM write access for certificates
  #checkov:skip=CKV_AWS_355:CI/CD deploy role needs wildcard for certificate resources
  name = "acm-access"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "acm:RequestCertificate",
          "acm:DescribeCertificate",
          "acm:ListCertificates",
          "acm:DeleteCertificate",
          "acm:ListTagsForCertificate",
          "acm:AddTagsToCertificate",
          "acm:RemoveTagsFromCertificate"
        ]
        Resource = "*"
      }
    ]
  })
}

# IAM - scoped to roles with snakes-and-ladders prefix
resource "aws_iam_role_policy" "iam" {
  name = "iam-access"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "iam:GetRole",
          "iam:PassRole",
          "iam:CreateRole",
          "iam:DeleteRole",
          "iam:AttachRolePolicy",
          "iam:DetachRolePolicy",
          "iam:PutRolePolicy",
          "iam:DeleteRolePolicy",
          "iam:GetRolePolicy",
          "iam:ListRolePolicies",
          "iam:ListAttachedRolePolicies",
          "iam:ListInstanceProfilesForRole",
          "iam:TagRole",
          "iam:UntagRole"
        ]
        Resource = [
          "arn:aws:iam::*:role/snakes-and-ladders-*"
        ]
      }
    ]
  })
}

# SSM - for reading certificate ARN
resource "aws_iam_role_policy" "ssm" {
  name = "ssm-access"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Resource = "arn:aws:ssm:*:*:parameter/snakes-and-ladders/*"
      }
    ]
  })
}

# KMS - for encryption keys
resource "aws_iam_role_policy" "kms" {
  #checkov:skip=CKV_AWS_289:CI/CD deploy role needs KMS permissions for encryption
  #checkov:skip=CKV_AWS_290:CI/CD deploy role needs KMS write access
  #checkov:skip=CKV_AWS_355:CI/CD deploy role needs wildcard for dynamic KMS keys
  name = "kms-access"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kms:CreateKey",
          "kms:CreateGrant",
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:GenerateDataKey",
          "kms:GenerateDataKeyWithoutPlaintext",
          "kms:DescribeKey",
          "kms:GetKeyPolicy",
          "kms:GetKeyRotationStatus",
          "kms:ListResourceTags",
          "kms:ScheduleKeyDeletion",
          "kms:TagResource",
          "kms:UntagResource",
          "kms:PutKeyPolicy",
          "kms:EnableKeyRotation",
          "kms:CreateAlias",
          "kms:DeleteAlias",
          "kms:UpdateAlias",
          "kms:ListAliases"
        ]
        Resource = "*"
      }
    ]
  })
}

# WAFv2 - for CloudFront protection
resource "aws_iam_role_policy" "waf" {
  #checkov:skip=CKV_AWS_290:CI/CD deploy role needs WAF write access
  #checkov:skip=CKV_AWS_355:CI/CD deploy role needs wildcard for WAF resources
  name = "waf-access"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "wafv2:CreateWebACL",
          "wafv2:DeleteWebACL",
          "wafv2:GetWebACL",
          "wafv2:ListWebACLs",
          "wafv2:UpdateWebACL",
          "wafv2:ListTagsForResource",
          "wafv2:TagResource",
          "wafv2:UntagResource",
          "wafv2:GetLoggingConfiguration",
          "wafv2:PutLoggingConfiguration",
          "wafv2:DeleteLoggingConfiguration",
          "wafv2:ListRuleGroups",
          "wafv2:GetManagedRuleSet",
          "wafv2:ListAvailableManagedRuleGroups",
          "wafv2:ListManagedRuleSets"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "iam:CreateServiceLinkedRole"
        ]
        Resource = "arn:aws:iam::*:role/aws-service-role/wafv2.amazonaws.com/*"
        Condition = {
          StringLike = {
            "iam:AWSServiceName" = "wafv2.amazonaws.com"
          }
        }
      }
    ]
  })
}

# =============================================================================
# API Gateway CloudWatch Logs Role (Account-level setting)
# Required for API Gateway to write access logs to CloudWatch
# =============================================================================

resource "aws_iam_role" "api_gateway_cloudwatch" {
  name = "snakes-and-ladders-api-gateway-cloudwatch"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "apigateway.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name    = "api-gateway-cloudwatch-role"
    Project = "snakes-and-ladders"
  }
}

resource "aws_iam_role_policy" "api_gateway_cloudwatch" {
  #checkov:skip=CKV_AWS_290:API Gateway service role requires broad CloudWatch access
  #checkov:skip=CKV_AWS_355:API Gateway service role requires wildcard for dynamic log groups
  name = "cloudwatch-logs"
  role = aws_iam_role.api_gateway_cloudwatch.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
          "logs:PutLogEvents",
          "logs:GetLogEvents",
          "logs:FilterLogEvents"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_api_gateway_account" "main" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_cloudwatch.arn
}

output "api_gateway_cloudwatch_role_arn" {
  value       = aws_iam_role.api_gateway_cloudwatch.arn
  description = "ARN of the API Gateway CloudWatch Logs role"
}

# =============================================================================
# ACM Certificate (us-east-1 for CloudFront)
# Created here and validated locally to avoid CI token timeout issues
# =============================================================================

data "aws_route53_zone" "main" {
  name         = var.route53_zone_name
  private_zone = false
}

resource "aws_acm_certificate" "frontend" {
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  validation_method = "DNS"

  tags = {
    Name    = "snakes-and-ladders-frontend-cert"
    Project = "snakes-and-ladders"
  }

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

# Store certificate ARN in SSM for CI to reference
resource "aws_ssm_parameter" "frontend_cert_arn" {
  #checkov:skip=CKV2_AWS_34:Certificate ARN is not sensitive - it's a public AWS resource identifier
  name        = "/snakes-and-ladders/certificates/frontend_cert_arn"
  description = "ARN of the validated frontend CloudFront certificate (us-east-1)"
  type        = "String"
  value       = aws_acm_certificate_validation.frontend.certificate_arn

  tags = {
    Project = "snakes-and-ladders"
  }
}

output "frontend_cert_arn" {
  value       = aws_acm_certificate_validation.frontend.certificate_arn
  description = "ARN of the validated frontend certificate for CloudFront (us-east-1)"
}
