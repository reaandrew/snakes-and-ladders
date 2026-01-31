variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-west-2"
}

variable "domain_name" {
  description = "Custom domain name for the frontend"
  type        = string
  default     = "snakes.techar.ch"
}

variable "route53_zone_name" {
  description = "Route53 hosted zone name"
  type        = string
  default     = "techar.ch"
}
