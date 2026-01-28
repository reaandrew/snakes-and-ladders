output "websocket_api_id" {
  description = "ID of the WebSocket API"
  value       = aws_apigatewayv2_api.websocket.id
}

output "websocket_api_endpoint" {
  description = "WebSocket API endpoint"
  value       = aws_apigatewayv2_api.websocket.api_endpoint
}

output "websocket_stage_url" {
  description = "WebSocket stage URL"
  value       = aws_apigatewayv2_stage.websocket.invoke_url
}

output "websocket_management_endpoint" {
  description = "WebSocket management endpoint for sending messages"
  value       = "${aws_apigatewayv2_api.websocket.api_endpoint}/${var.stage_name}"
}

output "http_api_id" {
  description = "ID of the HTTP API"
  value       = aws_apigatewayv2_api.http.id
}

output "http_api_endpoint" {
  description = "HTTP API endpoint"
  value       = aws_apigatewayv2_api.http.api_endpoint
}

output "http_stage_url" {
  description = "HTTP stage URL"
  value       = aws_apigatewayv2_stage.http.invoke_url
}
