output "dynamodb_table_name" {
  description = "Name of the DynamoDB table"
  value       = module.dynamodb.table_name
}

output "websocket_url" {
  description = "WebSocket API URL"
  value       = module.api_gateway.websocket_stage_url
}

output "http_api_url" {
  description = "HTTP API URL"
  value       = module.api_gateway.http_stage_url
}

output "frontend_url" {
  description = "Frontend CloudFront URL"
  value       = module.s3_cloudfront.cloudfront_url
}

output "frontend_bucket" {
  description = "Frontend S3 bucket name"
  value       = module.s3_cloudfront.bucket_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = module.s3_cloudfront.cloudfront_distribution_id
}
