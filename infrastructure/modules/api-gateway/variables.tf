variable "name" {
  description = "Base name for the API Gateway resources"
  type        = string
}

variable "stage_name" {
  description = "Stage name for the APIs"
  type        = string
  default     = "prod"
}

# WebSocket Lambda configuration
variable "connect_lambda_invoke_arn" {
  description = "Invoke ARN for the connect Lambda"
  type        = string
}

variable "connect_lambda_name" {
  description = "Name of the connect Lambda function"
  type        = string
}

variable "disconnect_lambda_invoke_arn" {
  description = "Invoke ARN for the disconnect Lambda"
  type        = string
}

variable "disconnect_lambda_name" {
  description = "Name of the disconnect Lambda function"
  type        = string
}

variable "default_lambda_invoke_arn" {
  description = "Invoke ARN for the default Lambda"
  type        = string
}

variable "default_lambda_name" {
  description = "Name of the default Lambda function"
  type        = string
}

# HTTP Lambda configuration
variable "create_game_lambda_invoke_arn" {
  description = "Invoke ARN for the create game Lambda"
  type        = string
}

variable "create_game_lambda_name" {
  description = "Name of the create game Lambda function"
  type        = string
}

variable "get_game_lambda_invoke_arn" {
  description = "Invoke ARN for the get game Lambda"
  type        = string
}

variable "get_game_lambda_name" {
  description = "Name of the get game Lambda function"
  type        = string
}

variable "cors_origins" {
  description = "CORS allowed origins"
  type        = list(string)
  default     = ["*"]
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
