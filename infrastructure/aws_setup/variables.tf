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

variable "terraform_lock_table" {
  description = "DynamoDB table for Terraform state locking"
  type        = string
  default     = "snakes-and-ladders-terraform-lock"
}
