variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-west-2"
}

variable "github_org" {
  description = "GitHub organization"
  type        = string
  default     = "reaandrew"
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "snakes-and-ladders"
}

variable "terraform_state_bucket" {
  description = "S3 bucket for Terraform state"
  type        = string
  default     = "snakes-and-ladders-terraform-state"
}

variable "domain_name" {
  description = "Domain name for the frontend"
  type        = string
  default     = "snakes.demos.apps.equal.expert"
}

variable "route53_zone_name" {
  description = "Route53 hosted zone name"
  type        = string
  default     = "demos.apps.equal.expert"
}

