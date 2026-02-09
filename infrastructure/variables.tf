variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-west-2"
}

variable "domain_name" {
  description = "Custom domain name for the frontend"
  type        = string
  default     = "snakes.demos.apps.equal.expert"
}

variable "route53_zone_name" {
  description = "Route53 hosted zone name"
  type        = string
  default     = "demos.apps.equal.expert"
}
