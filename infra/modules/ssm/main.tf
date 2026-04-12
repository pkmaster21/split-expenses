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

variable "google_client_id" {
  type = string
}

variable "google_client_secret" {
  type      = string
  sensitive = true
}

variable "google_redirect_uri" {
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

resource "aws_ssm_parameter" "google_client_id" {
  name        = "/${var.prefix}/GOOGLE_CLIENT_ID"
  type        = "String"
  value       = var.google_client_id
  description = "Google OAuth client ID"
  tags        = var.tags
}

resource "aws_ssm_parameter" "google_client_secret" {
  name        = "/${var.prefix}/GOOGLE_CLIENT_SECRET"
  type        = "SecureString"
  value       = var.google_client_secret
  description = "Google OAuth client secret"
  tags        = var.tags
}

resource "aws_ssm_parameter" "google_redirect_uri" {
  name        = "/${var.prefix}/GOOGLE_REDIRECT_URI"
  type        = "String"
  value       = var.google_redirect_uri
  description = "Google OAuth redirect URI"
  tags        = var.tags
}

output "path_prefix" {
  value = "/${var.prefix}"
}
