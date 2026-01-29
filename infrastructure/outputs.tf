output "dynamodb_table_name" {
  description = "Name of the DynamoDB table"
  value       = aws_dynamodb_table.main.name
}

output "websocket_url" {
  description = "WebSocket API URL"
  value       = aws_apigatewayv2_stage.websocket.invoke_url
}

output "http_api_url" {
  description = "HTTP API URL"
  value       = aws_apigatewayv2_stage.http.invoke_url
}

output "frontend_url" {
  description = "Frontend URL"
  value       = "https://${var.domain_name}"
}

output "frontend_bucket" {
  description = "Frontend S3 bucket name"
  value       = aws_s3_bucket.frontend.bucket
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "acm_certificate_arn" {
  description = "ACM certificate ARN"
  value       = aws_acm_certificate.frontend.arn
}
