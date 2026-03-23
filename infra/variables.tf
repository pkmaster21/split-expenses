variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "prod"
  validation {
    condition     = var.environment == "prod"
    error_message = "Environment must be 'prod'."
  }
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "neon_database_url" {
  description = "Neon PostgreSQL connection string"
  type        = string
  sensitive   = true
}

variable "cors_origin" {
  description = "Allowed CORS origin for the API"
  type        = string
}

variable "cookie_secret" {
  description = "Secret for signing cookies"
  type        = string
  sensitive   = true
}
