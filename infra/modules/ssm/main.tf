variable "prefix" {
  type = string
}

variable "tags" {
  type = map(string)
}

variable "database_url" {
  type      = string
  sensitive = true
}

variable "cookie_secret" {
  type      = string
  sensitive = true
}

variable "cors_origin" {
  type = string
}

resource "aws_ssm_parameter" "database_url" {
  name        = "/${var.prefix}/DATABASE_URL"
  type        = "SecureString"
  value       = var.database_url
  description = "PostgreSQL connection string"
  tags        = var.tags
}

resource "aws_ssm_parameter" "cookie_secret" {
  name        = "/${var.prefix}/COOKIE_SECRET"
  type        = "SecureString"
  value       = var.cookie_secret
  description = "Cookie signing secret"
  tags        = var.tags
}

resource "aws_ssm_parameter" "cors_origin" {
  name        = "/${var.prefix}/CORS_ORIGIN"
  type        = "String"
  value       = var.cors_origin
  description = "Allowed CORS origin"
  tags        = var.tags
}

output "path_prefix" {
  value = "/${var.prefix}"
}
