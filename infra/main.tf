terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  cloud {
    organization = "dzhao-projects"
    workspaces {
      name = "tabby-workspace"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

locals {
  prefix = "tabby-${var.environment}"
  tags = {
    Project     = "tabby"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

module "ssm" {
  source        = "./modules/ssm"
  prefix        = local.prefix
  tags          = local.tags
  database_url  = var.neon_database_url
  cookie_secret = var.cookie_secret
  cors_origin   = var.cors_origin
}

module "lambda" {
  source          = "./modules/lambda"
  prefix          = local.prefix
  tags            = local.tags
  ssm_path_prefix = module.ssm.path_prefix
  environment     = var.environment
}

module "api_gateway" {
  source      = "./modules/api_gateway"
  prefix      = local.prefix
  tags        = local.tags
  lambda_arn  = module.lambda.function_arn
  lambda_name = module.lambda.function_name
}

